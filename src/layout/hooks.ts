
import {
  useDispatch,
  useSelector,
} from "react-redux";

import type {
  RootState,
  AppDispatch,
} from "./store";

/**
 * Typed Redux dispatch hook.
 */
export const useAppDispatch =
  useDispatch.withTypes<AppDispatch>();

/**
 * Typed Redux selector hook.
 */
export const useAppSelector =
  useSelector.withTypes<RootState>();

