import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaPaperPlane, FaCheck, FaTimes } from 'react-icons/fa';

import { postQuestion } from '../../reducers/questionSlice.js';
import { improveQuestion } from '../../services/aiService.js';

import { Col, Container, Form, Button, Card, Row } from 'react-bootstrap';
import './PostQuestion.css';

const AISuggestion = ({ text, onAccept, onReject }) => (
  <div className="pq-ai-bubble">
    <span className="pq-ai-bubble-label">AI suggestion</span>
    <p className="pq-ai-bubble-text">{text}</p>
    <div className="pq-ai-bubble-actions">
      <button type="button" className="pq-ai-btn pq-ai-btn--accept" onClick={onAccept} title="Accept">
        <FaCheck />
      </button>
      <button type="button" className="pq-ai-btn pq-ai-btn--reject" onClick={onReject} title="Reject">
        <FaTimes />
      </button>
    </div>
  </div>
);

const PostQuestion = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [dismissed, setDismissed] = useState({ title: false, description: false, tags: false });

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.user.userInfo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(postQuestion({ title, description, tags }));
      if (postQuestion.fulfilled.match(result)) {
        alert('Question posted successfully!');
        navigate(`/question/${result.payload._id}`);
      }
    } catch (error) {
      console.error('Error posting question:', error);
      alert('Failed to post question. Please try again.');
    }
  };

  const handleImprove = async () => {
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const data = await improveQuestion(title, description, tags, userInfo?.token);
      setAiSuggestions(data);
      setDismissed({ title: false, description: false, tags: false });
    } catch (err) {
      alert('AI improvement failed. Please try again.');
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const accept = (field) => {
    if (field === 'title') setTitle(aiSuggestions.improved_title);
    if (field === 'description') setDescription(aiSuggestions.improved_description);
    if (field === 'tags') setTags(
      Array.isArray(aiSuggestions.improved_tags)
        ? aiSuggestions.improved_tags.join(', ')
        : aiSuggestions.improved_tags
    );
    setDismissed((prev) => ({ ...prev, [field]: true }));
  };

  const reject = (field) => {
    setDismissed((prev) => ({ ...prev, [field]: true }));
  };

  const showTitleSuggestion  = aiSuggestions && !dismissed.title;
  const showBodySuggestion   = aiSuggestions && !dismissed.description;
  const showTagsSuggestion   = aiSuggestions && !dismissed.tags;

  const canImprove = title.trim() && description.trim() && !aiLoading;

  return (
    <Container className="py-3 px-2 py-sm-4 px-sm-3 pq-page-container">
      <Row className="justify-content-center">
        <Col xs={12} lg={10} xl={9}>
          <Card className="mb-4 pq-header-card">
            <Card.Body className="p-3 p-sm-4">
              <Card.Title as="h2" className="pq-title">Ask a Question</Card.Title>
              <p className="text-muted mb-0">Be specific and imagine you're asking another person</p>
            </Card.Body>
          </Card>

          <Card className="pq-body-card">
            <Card.Body className="p-3 p-sm-4">
              <Form onSubmit={handleSubmit}>

                <Form.Group className={showTitleSuggestion ? 'mb-2' : 'mb-4'}>
                  <Form.Label htmlFor="title" className="pq-label">Title</Form.Label>
                  <Form.Control
                    type="text"
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's your programming question?"
                    required
                    className="pq-input"
                  />
                </Form.Group>
                {showTitleSuggestion && (
                  <AISuggestion
                    text={aiSuggestions.improved_title}
                    onAccept={() => accept('title')}
                    onReject={() => reject('title')}
                  />
                )}

                <Form.Group className={showBodySuggestion ? 'mb-2' : 'mb-4'}>
                  <Form.Label htmlFor="description" className="pq-label">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    id="description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide more details about your question..."
                    rows={10}
                    required
                    className="pq-textarea"
                  />
                </Form.Group>
                {showBodySuggestion && (
                  <AISuggestion
                    text={aiSuggestions.improved_description}
                    onAccept={() => accept('description')}
                    onReject={() => reject('description')}
                  />
                )}

                <Form.Group className={showTagsSuggestion ? 'mb-2' : 'mb-4'}>
                  <Form.Label htmlFor="tags" className="pq-label">Tags (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    id="tags"
                    name="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., javascript, react, css"
                    className="pq-input"
                  />
                  {!showTagsSuggestion && (
                    <Form.Text className="text-muted">
                      Add up to 5 tags to describe what your question is about
                    </Form.Text>
                  )}
                </Form.Group>
                {showTagsSuggestion && (
                  <AISuggestion
                    text={
                      Array.isArray(aiSuggestions.improved_tags)
                        ? aiSuggestions.improved_tags.join(', ')
                        : aiSuggestions.improved_tags
                    }
                    onAccept={() => accept('tags')}
                    onReject={() => reject('tags')}
                  />
                )}

                <Button
                  type="button"
                  variant="outline-secondary"
                  className="w-100 mb-3 pq-improve-btn"
                  onClick={handleImprove}
                  disabled={!canImprove}
                >
                  {aiLoading ? 'Improving...' : 'Improve with AI'}
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-100 pq-btn"
                >
                  <FaPaperPlane className="me-2" />
                  Post Question
                </Button>

              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PostQuestion;
