import mongoose from "mongoose";
import User from "../models/User.js";
import Question from "../models/Question.js";
import Answer from "../models/Answer.js";
import { createAppError } from "../utils/createAppError.js";

// Save a question to the user's bookmarks. Idempotent via $addToSet.
export const addBookmarkService = async (userId, questionId) => {
  if (!mongoose.isValidObjectId(questionId)) {
    throw createAppError("Question not found", 404);
  }

  const exists = await Question.exists({ _id: questionId });
  if (!exists) {
    throw createAppError("Question not found", 404);
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { bookmarks: questionId },
  });

  return { questionId, bookmarked: true };
};

// Remove a question from the user's bookmarks. Idempotent via $pull.
export const removeBookmarkService = async (userId, questionId) => {
  if (!mongoose.isValidObjectId(questionId)) {
    throw createAppError("Question not found", 404);
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { bookmarks: questionId },
  });

  return { questionId, bookmarked: false };
};

// Return the user's saved questions, newest-saved first, in the same
// populated shape the feed uses (author name, tags, answerCount).
export const getSavedQuestionsService = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "bookmarks",
    populate: [
      { path: "author", select: "name" },
      { path: "tags" },
    ],
  });

  if (!user) {
    throw createAppError("User not found", 404);
  }

  // Drop nulls (questions that were deleted after being bookmarked),
  // newest-saved first ($addToSet appends, so reverse).
  const saved = (user.bookmarks || []).filter(Boolean).reverse();

  const withCounts = await Promise.all(
    saved.map(async (q) => {
      const answerCount = await Answer.countDocuments({ questionId: q._id });
      return { ...(q.toObject?.() ?? q), answerCount };
    }),
  );

  return withCounts;
};
