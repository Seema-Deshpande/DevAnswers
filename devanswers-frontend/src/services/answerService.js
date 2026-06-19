import axiosInstance from "../api/axiosInstance.js";
import { ANSWER_API } from "../config/config.js";

export const upvoteAnswer = async (answerId, token) => {
  const res = await axiosInstance.post(
    ANSWER_API.UPVOTE(answerId),
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.data;
};

export const downvoteAnswer = async (answerId, token) => {
  const res = await axiosInstance.post(
    ANSWER_API.DOWNVOTE(answerId),
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.data;
};

// Feature 2 — edit an answer's text
export const updateAnswer = async (answerId, answerText, token) => {
  const res = await axiosInstance.put(
    ANSWER_API.UPDATE(answerId),
    { answerText },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.data;
};
