'use strict';

const { ObjectId } = require('../db');
const { parseBlogId, generateSafeSlug } = require('../utils/helpers');

async function getAll(blogsCol) {
  const blogs = await blogsCol.find({}).sort({ createdAt: -1 }).toArray();
  return blogs.map(blog => ({
    ...blog,
    _id: blog._id?.toString(),
    id: blog._id?.toString() || blog.id
  }));
}

async function create(blogsCol, blogData) {
  const result = await blogsCol.insertOne(blogData);
  const created = await blogsCol.findOne({ _id: result.insertedId });
  return {
    ...created,
    _id: created._id.toString(),
    id: created._id.toString()
  };
}

async function update(blogsCol, id, updates) {
  const query = parseBlogId(id);
  const result = await blogsCol.updateOne(query, { $set: updates });
  if (result.matchedCount === 0) {
    const err = new Error('Blog not found');
    err.status = 404;
    throw err;
  }
  const updated = await blogsCol.findOne(query);
  return {
    ...updated,
    _id: updated._id?.toString(),
    id: updated._id?.toString() || updated.id
  };
}

async function remove(blogsCol, id) {
  const query = parseBlogId(id);
  const result = await blogsCol.deleteOne(query);
  if (result.deletedCount === 0) {
    const err = new Error('Blog not found');
    err.status = 404;
    throw err;
  }
  return { message: 'Blog deleted successfully' };
}

module.exports = {
  getAll,
  create,
  update,
  remove
};

