import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

import Home from './pages/Question/Home.jsx';
import QuestionDetail from './pages/Question/QuestionDetail.jsx';
import PostQuestion from './pages/Question/PostQuestion.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import Profile from './pages/Profile/Profile.jsx';
import Tags from './pages/Tags/Tags.jsx';
import BaseLayout from './layouts/BaseLayout.jsx';
import SideBarLayout from './layouts/SideBarLayout.jsx';
import { fetchSavedQuestions, clearBookmarks } from './reducers/bookmarkSlice.js';

function App() {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);

  // Hydrate the user's saved-question set on app load / after login so bookmark
  // icons render in the correct state immediately; clear it on logout.
  useEffect(() => {
    if (userInfo) {
      dispatch(fetchSavedQuestions());
    } else {
      dispatch(clearBookmarks());
    }
  }, [userInfo, dispatch]);

  return (
    <Router>
        <BaseLayout>
          <Routes>
            <Route element={<SideBarLayout><Outlet /></SideBarLayout>}>
              <Route path='/' element={<Home />} />
              <Route path='/question/:id' element={<QuestionDetail />} />
              <Route path='/ask' element={<PostQuestion />} />
              <Route path='/tags' element={<Tags />} />
              <Route path='/profile' element={<Profile />} />
            </Route>
            <Route path='/login' element={<Login />}/>
            <Route path='/register' element={<Register />}/>
          </Routes>
        </BaseLayout>
    </Router>
  )
}

export default App