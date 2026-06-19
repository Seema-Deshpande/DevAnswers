import { useState } from 'react';
import { Card, Row, Col, Badge, Form, Button, Alert } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { FaUser, FaClock, FaPencilAlt } from 'react-icons/fa';
import { voteQuestion, editQuestion } from '../../reducers/questionSlice';
import { formatDate } from '../../utils/timeFormat';
import VoteButtons from '../Shared/VoteButtons';
import BookmarkButton from '../Shared/BookmarkButton';
import './QuestionContent.css';

const QuestionContent = ({ question }) => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.user?.userInfo);
  const isOwner = !!userInfo && question.author?._id === userInfo.userId;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setTitle(question.title || '');
    setDescription(question.description || '');
    setTags((question.tags || []).map((t) => t.name).join(', '));
    setError('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        editQuestion({ id: question._id, title, description, tags }),
      ).unwrap();
      setIsEditing(false);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to update question.');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Card className="mb-4 qcontent-body-card">
        <Card.Body className="p-3 p-sm-4">
          <h4 className="mb-3">Edit question</h4>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tags (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. javascript, react"
              />
            </Form.Group>
            <div className="d-flex gap-2 justify-content-end">
              <Button variant="outline-secondary" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      {/* Question Header */}
      <Card className="mb-4 qcontent-header-card">
        <Card.Body className="p-3 p-sm-4">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <Card.Title as="h2" className="mb-3 qcontent-title">
              {question.title}
            </Card.Title>
            <div className="d-flex align-items-center gap-1">
              <BookmarkButton questionId={question._id} className="p-0 qcontent-bookmark-btn" />
              {isOwner && (
                <Button
                  variant="link"
                  className="p-0 qcontent-edit-btn"
                  onClick={startEdit}
                  aria-label="Edit question"
                  title="Edit question"
                >
                  <FaPencilAlt />
                </Button>
              )}
            </div>
          </div>
          <div className="d-flex flex-wrap gap-3 gap-sm-4 qcontent-meta">
            <span className="d-flex align-items-center gap-2">
              <FaClock />
              Asked {formatDate(question.createdAt)}
            </span>
            {question.isEdited && (
              <span className="qcontent-edited-indicator text-muted">(edited)</span>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Question Content */}
      <Card className="mb-4 qcontent-body-card">
        <Card.Body className="p-3 p-sm-4">
          <Row>
            {/* Voting Controls */}
            <Col xs="auto" className="d-flex flex-column align-items-center pe-3 pe-sm-4">
              <VoteButtons
                voteCount={question.voteCount}
                authorId={question.author?._id}
                onVote={(voteType) => dispatch(voteQuestion({ question, voteType }))}
                variant="outline-secondary"
                upClassName="mb-2 qcontent-vote-btn"
                downClassName="mt-2 qcontent-vote-btn"
                countClassName="qcontent-vote-count"
                upIconClassName="qcontent-icon-up"
                downIconClassName="qcontent-icon-down"
                itemType="question"
              />
            </Col>

            {/* Main Content */}
            <Col>
              <div className="mb-4 qcontent-description">
                {question.description}
              </div>

              <div className="mb-4">
                {question.tags?.map((tag) => (
                  <Badge
                    key={tag._id}
                    className="me-2 mb-2 qcontent-tag-badge"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>

              <div
                className="d-flex align-items-center gap-2 qcontent-author-row"
              >
                <FaUser className="qcontent-icon-sm" />
                <span>Posted by </span>
                <strong className="qcontent-author-name">{question.author?.name}</strong>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
};

export default QuestionContent;
