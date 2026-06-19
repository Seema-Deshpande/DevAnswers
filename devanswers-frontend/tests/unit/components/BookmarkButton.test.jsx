import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BookmarkButton from '../../../src/components/Shared/BookmarkButton';
import bookmarkReducer from '../../../src/reducers/bookmarkSlice';

const makeStore = ({ userInfo = null, savedIds = [] } = {}) =>
  configureStore({
    reducer: {
      user: () => ({ userInfo }),
      bookmark: bookmarkReducer,
    },
    preloadedState: {
      bookmark: { savedIds, savedQuestions: [], status: 'idle', error: null },
    },
  });

const renderButton = (storeOptions) => {
  const store = makeStore(storeOptions);
  const utils = render(
    <Provider store={store}>
      <BookmarkButton questionId="q1" />
    </Provider>,
  );
  return { store, ...utils };
};

describe('BookmarkButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the outline (unsaved) state when the question is not saved', () => {
    renderButton({ userInfo: { userId: 'u1', token: 't' }, savedIds: [] });
    expect(screen.getByLabelText('Bookmark this question')).toBeInTheDocument();
  });

  it('renders the filled (saved) state when the question is saved', () => {
    renderButton({ userInfo: { userId: 'u1', token: 't' }, savedIds: ['q1'] });
    const btn = screen.getByLabelText('Remove bookmark');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('blocks anonymous users with an alert and does not change state', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { store } = renderButton({ userInfo: null, savedIds: [] });

    await userEvent.click(screen.getByLabelText('Bookmark this question'));

    expect(alertSpy).toHaveBeenCalledWith('You must be logged in to bookmark a question.');
    expect(store.getState().bookmark.savedIds).toEqual([]);
  });

  it('saves the question when a logged-in user clicks (state flips to saved)', async () => {
    const { store } = renderButton({ userInfo: { userId: 'u1', token: 't' }, savedIds: [] });

    await userEvent.click(screen.getByLabelText('Bookmark this question'));

    await waitFor(() => {
      expect(store.getState().bookmark.savedIds).toContain('q1');
    });
  });
});
