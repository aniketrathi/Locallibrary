const Book = require("../models/book");
const BookInstance = require("../models/bookinstance");

const async = require("async");

const { body, validationResult } = require("express-validator");

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res) {
  BookInstance.find()
    .populate("book")
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("bookinstance-list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res) {
  const { id } = req.params;
  BookInstance.findById(id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance-detail", {
        title: "Copy: " + bookinstance.book.title,
        bookinstance: bookinstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res) {
  Book.find({}, "title").exec(function (err, books) {
    if (err) {
      return next(err);
    }
    // Successful, so render.
    res.render("bookinstance-form", {
      title: "Create BookInstance",
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitise fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    const { book, imprint, status, due_back } = req.body;
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: book,
      imprint: imprint,
      status: status,
      due_back: due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        // Successful, so render.
        res.render("bookinstance-form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      // Data from form is valid.
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res) {
  const { id } = req.params;
  BookInstance.findById(id).exec(function (err, bookinstance) {
    if (err) {
      return next(err);
    }
    if (bookinstance == null) {
      // No results.
      res.redirect("/catalog/bookinstances");
    }
    // Successful, so render.
    res.render("bookinstance-delete", {
      title: "Delete Copy: " + bookinstance.book.title,
      bookinstance: bookinstance,
    });
  });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res) {
  const { bookinstanceid } = req.body;
  BookInstance.findByIdAndRemove(bookinstanceid)
    .then(() => res.redirect("/catalog/bookinstances"))
    .catch((err) => next(err));
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res) {
  const { id } = req.params;
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(id).exec(callback);
      },
      book_list: function (callback) {
        Book.find({}, "title").exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance-form", {
        title: "Update bookinstance",
        bookinstance: results.bookinstance,
        book_list: results.book_list,
      });
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = function (req, res) {
  const { id } = req.params;
  BookInstance.findByIdAndUpdate(id, req.body).exec(function (
    err,
    updated_bookinstance
  ) {
    if (err) return next(err);
    else {
      res.redirect(updated_bookinstance.url);
    }
  });
};
