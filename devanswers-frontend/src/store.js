import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./reducers/userSlice";
import questionReducer from "./reducers/questionSlice";
import themeReducer from "./reducers/themeSlice";
import bookmarkReducer from "./reducers/bookmarkSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    question: questionReducer,
    theme: themeReducer,
    bookmark: bookmarkReducer,
  },
});

export default store;