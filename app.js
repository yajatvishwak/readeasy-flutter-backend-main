const express = require("express");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const app = express();
const path = require("path");
const { v4: uuidv4 } = require("uuid");
app.use(express.json());
app.use(morgan("dev"));
const fs = require("fs");
const pdf = require("pdf-parse");
const string = require("string-sanitizer");

app.use(fileUpload());

const Database = require("better-sqlite3");
const db = new Database("db.db", { verbose: console.log });

app.get("/", (req, res) => {
  res.send({ code: "heyy!" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const usernameExists = db
    .prepare("SELECT id,password,name from users where username=@username")
    .get({ username: username });
  console.log(usernameExists);
  if (
    usernameExists &&
    usernameExists.id &&
    usernameExists.password === password
  ) {
    return res.send({
      code: "success",
      id: usernameExists.id,
      name: usernameExists.name,
    });
  } else {
    res.send({
      code: "err",
      message: "Auth failed. Make sure the password is correct",
    });
  }
});

app.post("/signup", async (req, res) => {
  const { username, password, name } = req.body;
  console.log({ username, password, name });
  // check if username exists
  const usernameExists = db
    .prepare("SELECT id from users where username=@username")
    .get({ username });
  if (usernameExists && usernameExists.id) {
    return res.send({ code: "error", message: "Username exists" });
  }

  const insert = db.prepare(
    "INSERT INTO users (username, name, password) VALUES (@username , @name, @password)"
  );
  let info = insert.run({ username, name, password });
  console.log(info);
  if (info) {
    res.send({ isCreated: true, code: "success", id: info.lastInsertRowid });
  } else {
    res.send({ isCreated: false, code: "err" });
  }
});

app.post("/addpdf", (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files were uploaded.");
  }
  let pdffile = req.files.pdf;
  let id = req.body.id;
  let name = uuidv4();
  name += pdffile.name.substring(pdffile.name.lastIndexOf("."));

  pdffile.mv(path.join("uploads", name), function (err) {
    console.log(err);
    if (err) return res.status(500).send(err);
    const insert = db.prepare(
      "INSERT INTO files (id, filename , filetitle) VALUES (@id , @filename , @title)"
    );
    let info = insert.run({ id, filename: name, title: pdffile.name });

    /// read file
    let dataBuffer = fs.readFileSync(path.join("uploads", name));
    pdf(dataBuffer).then((data) => {
      let sanitizedText = string.sanitize.keepSpace(data.text);
      res.send({ text: sanitizedText });
    });
  });
});

app.post("/parsepdf", (req, res) => {
  const { filename } = req.body;
  let dataBuffer = fs.readFileSync(path.join("uploads", filename));
  const ft = db
    .prepare(
      "SELECT filetitle from files where files.filename=@filename"
    )
    .get({ filename });
    console.log(ft);
  pdf(dataBuffer).then((data) => {
    let sanitizedText = data.text;
    sanitizedText = sanitizedText.replace(/[\r\n]/gm, "");
    res.send({ text: sanitizedText, code: "success", filetitle: ft.filetitle });
  });
});

app.post("/getuserdetails", (req, res) => {
  const { id } = req.body;

  const usernameExists = db
    .prepare(
      "SELECT filename, filetitle from users, files where users.id=@id and files.id = users.id"
    )
    .all({ id });
  res.send({ code: "success", items: usernameExists });
});

app.listen(5000, () => {
  console.log("Listening on 5000");
});
