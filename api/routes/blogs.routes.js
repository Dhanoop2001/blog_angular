'use strict';

const express = require('express');
const blogsController = require('../controllers/blogs.controller');
const { upload } = require('../utils/upload');
const router = express.Router();

router.get('/', (req, res, next) => blogsController.getBlogs(req, res, res.locals.blogsCol));
router.post('/', upload.single('image'), (req, res, next) => blogsController.createBlog(req, res, res.locals.blogsCol));
router.put('/:id', upload.single('image'), (req, res, next) => blogsController.updateBlog(req, res, res.locals.blogsCol));
router.patch('/:id', upload.single('image'), (req, res, next) => blogsController.updateBlog(req, res, res.locals.blogsCol));
router.delete('/:id', (req, res, next) => blogsController.deleteBlog(req, res, res.locals.blogsCol));

module.exports = router;

