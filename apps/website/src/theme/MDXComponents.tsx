// Lightweight handbook components available in every .mdx page without imports.
// QuestionEmbed pulls in the full question bank, so pages import it explicitly.
import MDXComponents from '@theme-original/MDXComponents';
import Spoiler from '@site/src/components/Spoiler';
import LevelExpectations from '@site/src/components/LevelExpectations';
import RelatedQuestions from '@site/src/components/RelatedQuestions';

export default {...MDXComponents, Spoiler, LevelExpectations, RelatedQuestions};
