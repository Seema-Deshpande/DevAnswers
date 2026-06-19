import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import QuestionContent from '../../../src/components/Question/QuestionContent';
import AnswerList from '../../../src/components/Answer/AnswerList';
import questionReducer from '../../../src/reducers/questionSlice';
import bookmarkReducer from '../../../src/reducers/bookmarkSlice';

const makeStore = (userId = 'user-1') =>
  configureStore({
    reducer: {
      question: questionReducer,
      bookmark: bookmarkReducer,
      user: () => ({ userInfo: userId ? { userId, token: 't' } : null }),
    },
  });

const renderWith = (ui, userId) =>
  render(<Provider store={makeStore(userId)}>{ui}</Provider>);

const question = (over = {}) => ({
  _id: 'q1',
  title: 'Original title',
  description: 'Original body',
  voteCount: 3,
  tags: [{ _id: 't1', name: 'react' }],
  author: { _id: 'user-1', name: 'Alice' },
  createdAt: '2026-01-10T10:00:00.000Z',
  ...over,
});

describe('Feature 2 — question edit affordances', () => {
  it('shows the edit pencil to the author', () => {
    renderWith(<QuestionContent question={question()} />, 'user-1');
    expect(screen.getByLabelText('Edit question')).toBeInTheDocument();
  });

  it('hides the edit pencil from a non-author', () => {
    renderWith(<QuestionContent question={question()} />, 'someone-else');
    expect(screen.queryByLabelText('Edit question')).not.toBeInTheDocument();
  });

  it('does not show "(edited)" for an unedited question', () => {
    renderWith(<QuestionContent question={question({ isEdited: false })} />, 'user-1');
    expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
  });

  it('shows "(edited)" for an edited question', () => {
    renderWith(<QuestionContent question={question({ isEdited: true })} />, 'user-1');
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('opens a pre-filled edit form and can cancel back', async () => {
    renderWith(<QuestionContent question={question()} />, 'user-1');
    await userEvent.click(screen.getByLabelText('Edit question'));

    expect(screen.getByDisplayValue('Original title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original body')).toBeInTheDocument();
    expect(screen.getByDisplayValue('react')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Original title')).toBeInTheDocument();
  });
});

describe('Feature 2 — answer edit affordances', () => {
  const answers = [
    { _id: 'a1', answerText: 'My answer', author: { _id: 'user-1', name: 'Alice' }, voteCount: 1, isEdited: false, createdAt: '2026-01-11T10:00:00.000Z' },
    { _id: 'a2', answerText: 'Their answer', author: { _id: 'user-2', name: 'Bob' }, voteCount: 2, isEdited: true, createdAt: '2026-01-11T11:00:00.000Z' },
  ];

  it('shows the edit pencil only on the user\'s own answer', () => {
    renderWith(<AnswerList answers={answers} question={question()} />, 'user-1');
    // exactly one "Edit answer" affordance (for a1), not for a2
    expect(screen.getAllByLabelText('Edit answer')).toHaveLength(1);
  });

  it('shows "(edited)" on an edited answer only', () => {
    renderWith(<AnswerList answers={answers} question={question()} />, 'user-1');
    expect(screen.getAllByText('(edited)')).toHaveLength(1);
  });
});
