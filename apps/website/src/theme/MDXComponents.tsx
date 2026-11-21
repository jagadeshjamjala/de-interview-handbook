// Make handbook components available in every .mdx page without imports.
import MDXComponents from '@theme-original/MDXComponents';
import Spoiler from '@site/src/components/Spoiler';
import LevelExpectations from '@site/src/components/LevelExpectations';
import RelatedQuestions from '@site/src/components/RelatedQuestions';
import QuestionEmbed from '@site/src/components/QuestionEmbed';

export default {...MDXComponents, Spoiler, LevelExpectations, RelatedQuestions, QuestionEmbed};
