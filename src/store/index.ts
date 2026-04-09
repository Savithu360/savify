import { configureStore } from '@reduxjs/toolkit';
import { musicApi } from '@/services/MusicAPI';

export const store = configureStore({
  reducer: {
    [musicApi.reducerPath]: musicApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      musicApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;