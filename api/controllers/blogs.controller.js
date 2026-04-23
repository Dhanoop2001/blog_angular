'use strict';

const { getAll, create, update, remove } = require('../models/blog.model');
const { generateSafeSlug } = require('../utils/helpers');
const { upload } = require('../utils/upload');

async function getBlogs(req, res, blogsCol) {
  try {
    const blogs = await getAll(blogsCol);
    res.json(blogs);
  } catch (err) {
    console.error('Get blogs error:', err);
    res.status(500).json({ message: 'Failed to fetch blogs' });
  }
}

async function createBlog(req, res, blogsCol) {
  try {
    const { title, content, author, status, slug } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ message: 'Title, content and author are required' });
    }

    const safeSlug = slug ? generateSafeSlug(slug) : generateSafeSlug(title);
    const blogData = {
      title: String(title).trim(),
      content: String(content).trim(),
      author: String(author).trim(),
      status: status === 'Draft' ? 'Draft' : 'Publish',
      slug: safeSlug,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const blog = await create(blogsCol, blogData);
    res.status(201).json(blog);
  } catch (err) {
    console.error('Create blog error:', err);
    res.status(500).json({ message: 'Failed to create blog' });
  }
}

async function updateBlog(req, res, blogsCol) {
  try {
    const { id } = req.params;
    const { title, content, author, status, slug } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ message: 'Title, content and author are required' });
    }

    const safeSlug = slug ? generateSafeSlug(slug) : generateSafeSlug(title);
    const updates = {
      title: String(title).trim(),
      content: String(content).trim(),
      author: String(author).trim(),
      status: status === 'Draft' ? 'Draft' : 'Publish',
      slug: safeSlug,
      updatedAt: new Date().toISOString(),
    };

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    const blog = await update(blogsCol, id, updates);
    res.json(blog);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Update blog error:', err);
    res.status(500).json({ message: 'Failed to update blog' });
  }
}

async function deleteBlog(req, res, blogsCol) {
  try {
    const { id } = req.params;
    const result = await remove(blogsCol, id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Delete blog error:', err);
    res.status(500).json({ message: 'Failed to delete blog' });
  }
}

module.exports = {
  getBlogs,
  createBlog,
  updateBlog,
  deleteBlog
};

