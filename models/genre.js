const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GenreSchema = new Schema({
  name: { type: String, required: true, maxlength: 100, minlength: 3 },
});

GenreSchema.virtual("url").get(function () {
  return "/catalog/genre/" + this.id;
});

module.exports = mongoose.model("Genre", GenreSchema);
