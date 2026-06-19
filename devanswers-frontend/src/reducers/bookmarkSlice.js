import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getSavedQuestions,
  addBookmark as addBookmarkApi,
  removeBookmark as removeBookmarkApi,
} from "../services/questionService.js";

const initialState = {
  savedIds: [], // authoritative source for bookmark icon state everywhere
  savedQuestions: [], // full question objects, for the profile "Saved Questions" list
  status: "idle",
  error: null,
};

export const fetchSavedQuestions = createAsyncThunk(
  "bookmark/fetchSavedQuestions",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().user.userInfo?.token;
      return await getSavedQuestions(token);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to load saved questions",
      );
    }
  },
);

export const addBookmark = createAsyncThunk(
  "bookmark/addBookmark",
  async (questionId, { getState, rejectWithValue }) => {
    try {
      const token = getState().user.userInfo?.token;
      await addBookmarkApi(questionId, token);
      return questionId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to bookmark",
      );
    }
  },
);

export const removeBookmark = createAsyncThunk(
  "bookmark/removeBookmark",
  async (questionId, { getState, rejectWithValue }) => {
    try {
      const token = getState().user.userInfo?.token;
      await removeBookmarkApi(questionId, token);
      return questionId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove bookmark",
      );
    }
  },
);

const bookmarkSlice = createSlice({
  name: "bookmark",
  initialState,
  reducers: {
    clearBookmarks: (state) => {
      state.savedIds = [];
      state.savedQuestions = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSavedQuestions.pending, (state) => {
        state.status = "pending";
        state.error = null;
      })
      .addCase(fetchSavedQuestions.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.savedQuestions = action.payload;
        state.savedIds = action.payload.map((q) => q._id);
      })
      .addCase(fetchSavedQuestions.rejected, (state, action) => {
        state.status = "rejected";
        state.error = action.payload || action.error.message;
      })
      .addCase(addBookmark.fulfilled, (state, action) => {
        if (!state.savedIds.includes(action.payload)) {
          state.savedIds.push(action.payload);
        }
      })
      .addCase(removeBookmark.fulfilled, (state, action) => {
        state.savedIds = state.savedIds.filter((id) => id !== action.payload);
        state.savedQuestions = state.savedQuestions.filter(
          (q) => q._id !== action.payload,
        );
      });
  },
});

export const { clearBookmarks } = bookmarkSlice.actions;

export default bookmarkSlice.reducer;
