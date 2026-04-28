import type { Namespace } from 'i18next';
import { useTranslation } from 'react-i18next';
export const useT = <NS extends Namespace>(ns: NS) => useTranslation(ns).t;
