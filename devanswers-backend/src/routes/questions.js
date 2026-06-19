import express from "express";

import {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  upvoteQuestion,
  downvoteQuestion,
  improveQuestion,
} from "../controllers/questionController.js";
import {
  getAnswersByQuestionId,
  createAnswer,
} from "../controllers/answerController.js";
import {
  bookmarkQuestion,
  unbookmarkQuestion,
  getSavedQuestions,
} from "../controllers/bookmarkController.js";
import authenticate from "../middleware/authHandler.js";

const router = express.Router();

// IMPORTANT: the literal "/saved" route must be declared before "/:id",
// otherwise Express matches "saved" as an :id param.
router.get("/saved", authenticate, getSavedQuestions);

// Public routes - no authentication required
router.get("/", getAllQuestions);
router.get("/:id", getQuestionById);
router.get("/:questionId/answers", getAnswersByQuestionId);

// Protected routes - authentication required
router.post("/improve", authenticate, improveQuestion);
router.post("/", authenticate, createQuestion);
router.put("/:id", authenticate, updateQuestion);
router.delete("/:id", authenticate, deleteQuestion);
router.post("/:id/upvote", authenticate, upvoteQuestion);
router.post("/:id/downvote", authenticate, downvoteQuestion);
router.post("/:id/bookmark", authenticate, bookmarkQuestion);
router.delete("/:id/bookmark", authenticate, unbookmarkQuestion);
router.post("/:questionId/answers", authenticate, createAnswer);

export default router;
