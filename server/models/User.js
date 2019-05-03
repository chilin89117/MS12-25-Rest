const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    status: {type: String, require: true, default: 'new'},
    posts: [{type: Schema.Types.ObjectId, ref: 'Post'}]
  },
  {timestamps: true}
);

module.exports = mongoose.model('User', userSchema, 'ms1225users');
