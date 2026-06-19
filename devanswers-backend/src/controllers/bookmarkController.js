import {
  addBookmarkService,
  removeBookmarkService,
  getSavedQuestionsService,
} from "../services/bookmarkService.js";

export const bookmarkQuestion = async (req, res) => {
  const data = await addBookmarkService(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    message: "Question bookmarked successfully",
    data,
  });
};

export const unbookmarkQuestion = async (req, res) => {
  const data = await removeBookmarkService(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    message: "Bookmark removed successfully",
    data,
  });
};

export const getSavedQuestions = async (req, res) => {
  const data = await getSavedQuestionsService(req.user.id);

  res.status(200).json({
    success: true,
    message: "Saved questions fetched successfully",
    data,
  });
};
