import { configureStore } from '@reduxjs/toolkit'
import uiReducer from '../features/uiSlice'
import themeReducer from '../features/themeSlice'

export const store = configureStore({
    reducer: {
        ui: uiReducer,
        theme: themeReducer,
    },
})