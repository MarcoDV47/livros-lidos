import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  user: "/* Usuário */",
  host: "localhost",
  database: "books",
  password: "/* Senha */",
  port: 5432
});

db.connect();

let booksOrder = "rating";

async function fetchBooksData(sort = booksOrder) {
  const order = sort === "title" ? "ASC" : "DESC";

  try {
    const result = await db.query(`SELECT books.id, title, rating, code, summary, notes FROM books JOIN books_reviews ON books_reviews.id = books.id ORDER BY books.${sort} ${order}`);
    return result.rows;
  }
  catch (error) {
    console.log(error);
  }
}

async function fetchBookData(id) {
  try {
    const result = await db.query("SELECT books.id, title, rating, code, summary, notes FROM books JOIN books_reviews reviews ON books.id = reviews.id WHERE books.id = $1", [id]);
    return result.rows;
  }
  catch (error) {
    console.log(error);
  }
}

function formatContent(book) {
  let newString = book.notes.split("\n");
  return newString
}

app.get("/", async (req, res) => {
  booksOrder = req.query.sort ? req.query.sort : booksOrder;
  try {
    const books = await fetchBooksData(booksOrder);
    res.render("index.ejs", {
      books: books
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/book/:id", async (req, res) => {
  const result = await fetchBookData(req.params.id);
  res.render("book.ejs", { book: result[0] })
})

app.get("/add", (req, res) => {
  res.render("add.ejs")
});

app.post("/add", async (req, res) => {
  const book = req.body;
  try {
    const result = await db.query("INSERT INTO books(title, rating, code) VALUES ($1, $2, $3) RETURNING id", [book.title, parseInt(book.rating), book.code]);
    const bookId = result.rows[0].id;
    await db.query("INSERT INTO books_reviews(id, summary, notes) VALUES ($1, $2, $3)", [bookId, book.summary, book.notes]);

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.redirect("/add");
  }
});

app.get("/delete/:id", async (req, res) => {
  const bookId = req.params.id;
  try {
    await db.query("DELETE FROM books_reviews WHERE id = $1", [bookId]);
    await db.query("DELETE FROM books WHERE id = $1", [bookId]);

    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
})

app.get("/edit/:id", async (req, res) => {
  const bookId = req.params.id;
  const book = await fetchBookData(bookId);
  book[0].notes = formatContent(book[0]);

  res.render("edit.ejs", { book: book[0] })
})

app.post("/edit/:id", async (req, res) => {
  const bookId = req.params.id;
  const book = req.body;
  await db.query("UPDATE books SET (title, rating, code) = ($1, $2, $3) WHERE books.id = $4", [book.title, book.rating, book.code, bookId]);
  await db.query("UPDATE books_reviews SET (summary, notes) = ($1, $2) WHERE books_reviews.id = $3", [book.summary, book.notes, bookId]);

  res.redirect("/");
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
