# Matching score

The displayed total is calculated in application code as `skills × 0.50 + experience × 0.25 + projects × 0.15 + qualifications × 0.10`. Each component is 0–100. Skill importance changes the weighted fraction of required skills evidenced in the profile. Gemini embeddings retrieve paraphrased resume excerpts; cosine similarity contributes to project relevance and is shown separately. Displayed evidence is accepted only when the exact excerpt occurs in the stored resume text. A missing excerpt is reported as missing evidence, not proof that the candidate lacks the skill.

Names, contact details, and candidate location are excluded from matching and AI assessment inputs. Recruiters make all application decisions manually.
