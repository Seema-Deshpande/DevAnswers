import express from "express";
import {
  updateAnswer,
  deleteAnswer,
  upvoteAnswer,
  downvoteAnswer,
  summarizeAnswers,
} from "../controllers/answerController.js";
import authenticate from "../middleware/authHandler.js";

const router = express.Router();

// Protected routes - authentication required
router.post("/summarize", authenticate, summarizeAnswers);
router.put("/:answerId", authenticate, updateAnswer);
router.delete("/:answerId", authenticate, deleteAnswer);
router.post("/:answerId/upvote", authenticate, upvoteAnswer);
router.post("/:answerId/downvote", authenticate, downvoteAnswer);

export default router;
