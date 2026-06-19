import { Button } from 'react-bootstrap';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { addBookmark, removeBookmark } from '../../reducers/bookmarkSlice';
import './BookmarkButton.css';

// Stable reference so the fallback selector doesn't return a new array each render.
const EMPTY_IDS = [];

/**
 * Shared bookmark toggle used by QuestionCard (feed) and QuestionContent (detail).
 * Renders a filled icon when saved, an outline icon otherwise.
 * Handles the auth guard internally, mirroring VoteButtons.
 */
const BookmarkButton = ({ questionId, variant = 'link', className = '' }) => {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const savedIds = useSelector((state) => state.bookmark?.savedIds ?? EMPTY_IDS);
  const isSaved = savedIds.includes(questionId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      alert('You must be logged in to bookmark a question.');
      return;
    }

    if (isSaved) {
      dispatch(removeBookmark(questionId));
    } else {
      dispatch(addBookmark(questionId));
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={`bookmark-btn ${isSaved ? 'bookmark-btn--saved' : ''} ${className}`.trim()}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove bookmark' : 'Bookmark this question'}
      title={isSaved ? 'Saved — click to unsave' : 'Save for later'}
    >
      {isSaved ? <FaBookmark /> : <FaRegBookmark />}
    </Button>
  );
};

export default BookmarkButton;
