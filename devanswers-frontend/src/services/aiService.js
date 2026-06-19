import axiosInstance from '../api/axiosInstance.js';
import { AI_API } from '../config/config.js';

export const improveQuestion = async (title, description, tags, token) => {
  const res = await axiosInstance.post(
    AI_API.IMPROVE_QUESTION,
    { title, description, tags },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.data;
};

export const summarizeAnswers = async (questionTitle, questionDescription, answers, token) => {
  const res = await axiosInstance.post(
    AI_API.SUMMARIZE_ANSWERS,
    { questionTitle, questionDescription, answers },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.data;
};
