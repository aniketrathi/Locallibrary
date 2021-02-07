var Genre = require("../models/genre");
var Book = require("../models/book");

var async = require("async");

var { body, validationResult } = require("express-validator");

// Display list of all Genre.
exports.genre_list = function (req, res) {
  Genre.find()
    .sort([["name", "ascending"]])
    .exec(function (err, list_genres) {
      if (err) {
        return next(err);
      }
      //Successful, so render
      res.render("genre-list", {
        title: "Genre List",
        genre_list: list_genres,
      });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res) {
  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(req.params.id).exec(callback);
      },

      genre_books: function (callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.genre == null) {
        // No results.
        var err = new Error("Genre not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render("genre-detail", {
        title: "Genre Detail",
        genre: results.genre,
        genre_books: results.genre_books,
      });
    }
  );
};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res) {
  res.render("genre-form", { title: "Create Genre", errors: "" });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and santise the name field.
  body("name", "Genre name required").trim().isLength({ min: 2 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    var genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("genre-form", {
        title: "Create Genre",
        genre: genre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ name: req.body.name }).exec(function (err, found_genre) {
        if (err) {
          return next(err);
        }

        if (found_genre) {
          // Genre exists, redirect to its detail page.
          res.redirect(found_genre.url);
        } else {
          genre.save(function (err) {
            if (err) {
              return next(err);
            }
            // Genre saved. Redirect to genre detail page.
            res.redirect(genre.url);
          });
        }
      });
    }
  },
];
// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res) {
  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      genres_books: function (callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.genre == null) {
        // No results.
        res.redirect("/catalog/genres");
      }
      // Successful, so render.
      res.render("genre-delete", {
        title: "Delete Genre",
        genre: results.genre,
        genre_books: results.genres_books,
      });
    }
  );
};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res) {
  async.parallel(
    {
      genre: function (callback) {
        Genre.findById(req.body.genreid).exec(callback);
      },
      genres_books: function (callback) {
        Book.find({ genre: req.body.genreid }).exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      // Success
      if (results.genres_books.length > 0) {
        // Author has books. Render in same way as for GET route.
        res.render("genre-delete", {
          title: "Delete Genre",
          genre: results.genre,
          genre_books: results.genre_books,
        });
        return;
      } else {
        // Author has no books. Delete object and redirect to the list of authors.
        Genre.findByIdAndRemove(req.body.genreid)
          .then(() => res.redirect("/catalog/genres"))
          .catch((err) => next(err));
      }
    }
  );
};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res) {
  Genre.findById(req.params.id)
  .exec(function (err, genre) {
    if (err) {
      return next(err);
    }
    //Successful, so render
    res.render("genre-form", {
      title: "Genre Form update",
      genre: genre,
    });
  });
};

// Handle Genre update on POST.
exports.genre_update_post = function (req, res) {
  Genre.findByIdAndUpdate(req.params.id, req.body)
    .exec(function(err, updated_genre){
      if(err)
        return next(err);
      else{
        console.log(updated_genre);
        res.redirect('/catalog/genres');
      }
    })
};
