import express from 'express';
import multer from 'multer';
import { createPost, getPosts, getUserPosts, likePost, addComment, deleteComment } from '../controllers/postController.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const router = express.Router();

router.post('/', upload.single('media'), createPost);
router.get('/', getPosts);
router.get('/user/:userId', getUserPosts);
router.put('/:id/like', likePost);
router.post('/:id/comment', addComment);
router.delete('/:id/comment/:commentId', deleteComment);

export default router;