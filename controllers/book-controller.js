const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");

const async = require("async");

const { body, validationResult } = require("express-validator");

exports.index = function (req, res) {
  async.parallel(
    {
      book_count: function (callback) {
        Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
      },
      book_instance_count: function (callback) {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count: function (callback) {
        BookInstance.countDocuments({ status: "Available" }, callback);
      },
      author_count: function (callback) {
        Author.countDocuments({}, callback);
      },
      genre_count: function (callback) {
        Genre.countDocuments({}, callback);
      },
    },
    function (err, results) {
      res.render("index", {
        title: "Local Library Home",
        error: err,
        data: results,
      });
    }
  );
};

// Display list of all books.
exports.book_list = function (req, res, next) {
  Book.find({}, "title author")
    .populate("author")
    .exec(function (err, list_books) {
      if (err) {
        return next(err);
      }
      //Successful, so render
      res.render("book-list", { title: "Book List", book_list: list_books });
    });
};
// Display detail page for a specific book.
exports.book_detail = function (req, res) {
  const { id } = req.params;
  async.parallel(
    {
      book: function (callback) {
        Book.findById(id).populate("author").populate("genre").exec(callback);
      },
      book_instance: function (callback) {
        BookInstance.find({ book: id }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("book-detail", {
        title: results.book.title,
        book: results.book,
        book_instances: results.book_instance,
      });
    }
  );
};

// Display book create form on GET.
exports.book_create_get = function (req, res) {
  // Get all authors and genres, which we can use for adding to our book.
  async.parallel(
    {
      authors: function (callback) {
        Author.find(callback);
      },
      genres: function (callback) {
        Genre.find(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      res.render("book-form", {
        title: "Create Book",
        authors: results.authors,
        genres: results.genres,
      });
    }
  );
};

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") req.body.genre = [];
      else req.body.genre = new Array(req.body.genre);
    }
    next();
  },

  // Validate and sanitise fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    const { title, author, summary, isbn, genre } = req.body;
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    const book = new Book({
      title: title,
      author: author,
      summary: summary,
      isbn: isbn,
      genre: genre,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel(
        {
          authors: function (callback) {
            Author.find(callback);
          },
          genres: function (callback) {
            Genre.find(callback);
          },
        },
        function (err, results) {
          if (err) {
            return next(err);
          }

          // Mark our selected genres as checked.
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genres[i].checked = "true";
            }
          }
          res.render("book-form", {
            title: "Create Book",
            authors: results.authors,
            genres: results.genres,
            errors: errors.array(),
          });
        }
      );
      return;
    } else {
      // Data from form is valid. Save book.
      book.save(function (err) {
        if (err) {
          return next(err);
        }
        //successful - redirect to new book record.
        res.redirect(book.url);
      });
    }
  },
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res) {
  const { id } = req.params;
  async.parallel(
    {
      book: function (callback) {
        Book.findById(id).exec(callback);
      },
      books_bookinstances: function (callback) {
        BookInstance.find({ book: id }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // No results.
        res.redirect("/catalog/books");
      }
      // Successful, so render.
      res.render("book-delete", {
        title: "Delete Book",
        book: results.book,
        book_instances: results.books_bookinstances,
      });
    }
  );
};

// Handle book delete on POST.
exports.book_delete_post = function (req, res) {
  const { bookid } = req.body;
  async.parallel(
    {
      book: function (callback) {
        Genre.findById(bookid).exec(callback);
      },
      books_instances: function (callback) {
        Book.find({ book: bookid }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      // Success
      if (results.books_instances.length > 0) {
        // Author has books. Render in same way as for GET route.
        res.render("book-delete", {
          title: "Delete Book",
          book: results.book,
          book_instances: results.books_instances,
        });
        return;
      } else {
        // Author has no books. Delete object and redirect to the list of authors.
        Book.findByIdAndRemove(bookid)
          .then(() => res.redirect("/catalog/books"))
          .catch((err) => next(err));
      }
    }
  );
};

// Display book update form on GET.
exports.book_update_get = function (req, res) {
  const { id } = req.params;
  async.parallel(
    {
      book: function (callback) {
        Book.findById(id).exec(callback);
      },
      genres: function (callback) {
        Genre.find({}).exec(callback);
      },
      authors: function (callback) {
        Author.find({}).exec(callback);
      },
    },
    function (err, results) {
      if (err) return next(err);
      if (!results.book) {
        res.redirect("/catalog/books");
      }
      res.render("book-form", {
        title: "Update Book Form",
        book: results.book,
        genres: results.genres,
        authors: results.authors,
      });
    }
  );
};

// Handle book update on POST.
exports.book_update_post = function (req, res) {
  const { id } = req.params;
  Book.findByIdAndUpdate(id, req.body).exec(function (err, updated_book) {
    if (err) return next(err);
    else {
      res.redirect(updated_book.url);
    }
  });
};
