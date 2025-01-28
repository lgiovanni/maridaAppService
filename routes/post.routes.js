const express = require('express');
const router = express.Router();
const PostController = require('../controllers/post.controller');
const auth = require('../middlewares/auth.middleware');

// Proteger todas las rutas con autenticación
router.use(auth);

// Rutas para gestión de posts y stories
router.post('/', PostController.createPost);
router.get('/feed', PostController.getFeed);
router.get('/stories', PostController.getStories);
router.post('/:postId/like', PostController.likePost);
router.post('/:postId/comment', PostController.addComment);
router.post('/stories/:storyId/view', PostController.viewStory);

module.exports = router;