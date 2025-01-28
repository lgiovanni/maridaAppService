const Post = require('../models/post.model');
const User = require('../models/user.model');

class PostController {
  async createPost(req, res) {
    try {
      const { type, content, visibility } = req.body;
      const post = new Post({
        author: req.user.id,
        type,
        content,
        visibility
      });

      await post.save();
      await post.populate('author', 'name profilePicture');

      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getFeed(req, res) {
    try {
      const user = await User.findById(req.user.id);
      const query = {
        $or: [
          { visibility: 'public' },
          { author: { $in: user.friends } },
          { author: req.user.id }
        ],
        type: 'post'
      };

      const posts = await Post.find(query)
        .populate('author', 'name profilePicture')
        .sort({ createdAt: -1 })
        .limit(20);

      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getStories(req, res) {
    try {
      const user = await User.findById(req.user.id);
      const query = {
        type: 'story',
        'storyConfig.expiresAt': { $gt: new Date() },
        $or: [
          { visibility: 'public' },
          { author: { $in: user.friends } },
          { author: req.user.id }
        ]
      };

      const stories = await Post.find(query)
        .populate('author', 'name profilePicture')
        .sort({ createdAt: -1 });

      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async likePost(req, res) {
    try {
      const post = await Post.findById(req.params.postId);
      if (!post) {
        return res.status(404).json({ message: 'Publicación no encontrada' });
      }

      const likeExists = post.likes.some(
        like => like.user.toString() === req.user.id
      );

      if (likeExists) {
        post.likes = post.likes.filter(
          like => like.user.toString() !== req.user.id
        );
      } else {
        post.likes.push({
          user: req.user.id,
          timestamp: new Date()
        });
      }

      await post.save();
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async addComment(req, res) {
    try {
      const post = await Post.findById(req.params.postId);
      if (!post) {
        return res.status(404).json({ message: 'Publicación no encontrada' });
      }

      post.comments.push({
        user: req.user.id,
        text: req.body.text,
        timestamp: new Date()
      });

      await post.save();
      await post.populate('comments.user', 'name profilePicture');

      res.json(post);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async viewStory(req, res) {
    try {
      const story = await Post.findOne({
        _id: req.params.storyId,
        type: 'story',
        'storyConfig.expiresAt': { $gt: new Date() }
      });

      if (!story) {
        return res.status(404).json({ message: 'Historia no encontrada o expirada' });
      }

      const viewExists = story.storyConfig.views.some(
        view => view.user.toString() === req.user.id
      );

      if (!viewExists) {
        story.storyConfig.views.push({
          user: req.user.id,
          timestamp: new Date()
        });
        await story.save();
      }

      res.json(story);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new PostController();