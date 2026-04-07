/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { differenceInDays, parseISO } from 'date-fns';

/**
 * Calculates child's age in days.
 * @param birthDate ISO date string or Date object
 * @returns number of days
 */
export const calculateAgeInDays = (birthDate: string | Date): number => {
  const start = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  const end = new Date();
  return Math.max(0, differenceInDays(end, start));
};

/**
 * Formats the age string based on language.
 */
export const formatAgeString = (days: number, lang: 'ru' | 'en'): string => {
  if (lang === 'ru') {
    return `Малышу ${days} дней 💛`;
  }
  return `Baby is ${days} days old 💛`;
};
