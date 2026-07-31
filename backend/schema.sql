-- Schema Migration & Questions Seed Data

-- 1. Topics Table
CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  icon_url VARCHAR(255),
  question_count INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  topic_id INT NOT NULL,
  round_number INT, -- NULL for spin-selected rounds, 1 for fixed round
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  option_1 VARCHAR(255) NOT NULL,
  option_2 VARCHAR(255) NOT NULL,
  option_3 VARCHAR(255) NOT NULL,
  option_4 VARCHAR(255) NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 1 AND 4),
  difficulty VARCHAR(20) DEFAULT 'medium',
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 3. Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
  id VARCHAR(100) PRIMARY KEY, -- Room Code or UUID
  current_state VARCHAR(50) DEFAULT 'lobby', -- lobby, countdown, round_1, spin_1, etc.
  current_round INT DEFAULT 0,
  current_question INT DEFAULT 0,
  used_topics TEXT, -- JSON string or comma-separated list of IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Player Scores Table
CREATE TABLE IF NOT EXISTS player_scores (
  id VARCHAR(100) PRIMARY KEY, -- player_id
  game_session_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  round_1_score INT DEFAULT 0,
  round_2_score INT DEFAULT 0,
  round_3_score INT DEFAULT 0,
  round_4_score INT DEFAULT 0,
  round_5_score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- 5. Answer Log Table
CREATE TABLE IF NOT EXISTS answer_log (
  id SERIAL PRIMARY KEY,
  game_session_id VARCHAR(100) NOT NULL,
  player_id VARCHAR(100) NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  round_number INT NOT NULL,
  question_number INT NOT NULL,
  topic_id INT NOT NULL,
  selected_option INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- 6. Round Results Table
CREATE TABLE IF NOT EXISTS round_results (
  id SERIAL PRIMARY KEY,
  game_session_id VARCHAR(100) NOT NULL,
  round_number INT NOT NULL,
  player_id VARCHAR(100) NOT NULL,
  topic_id INT NOT NULL,
  score INT DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- 7. Tournament Statistics Table
CREATE TABLE IF NOT EXISTS tournament_stats (
  id SERIAL PRIMARY KEY,
  game_session_id VARCHAR(100) NOT NULL,
  round_number INT NOT NULL,
  average_score REAL,
  median_score REAL,
  accuracy_percentage REAL,
  difficulty_rating VARCHAR(20),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- Indexes for performance under 500-600 concurrent users
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_answer_log_session ON answer_log(game_session_id);
CREATE INDEX IF NOT EXISTS idx_answer_log_player ON answer_log(player_id);
CREATE INDEX IF NOT EXISTS idx_player_scores_session ON player_scores(game_session_id);

-- --- SEED TOPICS ---
INSERT INTO topics (id, name, description, icon_url) VALUES
(1, 'AI Pulse Check', 'General AI trends, history, and core technical concepts', 'pulse'),
(2, 'AI Image', 'Diffusion models, latent spaces, prompts and parameters', 'image'),
(3, 'AI Movie', 'Video synthesis, frame rates, and styling consistency', 'movie'),
(4, 'AI Music', 'Synthesizers, MIDI generation, and audio modeling', 'music'),
(5, 'Text-to-Video', 'Text prompt video generators and physics simulators', 'video'),
(6, 'Meme', 'AI meme generators, face-swapping, and templates', 'meme')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- --- SEED QUESTIONS ---

-- TOPIC 1: AI Pulse Check (Round 1)
INSERT INTO questions (topic_id, round_number, question_number, question_text, option_1, option_2, option_3, option_4, correct_option, difficulty) VALUES
(1, 1, 1, 'Which neural network architecture is the primary foundation for modern Large Language Models (LLMs)?', 'Recurrent Neural Networks (RNN)', 'Convolutional Neural Networks (CNN)', 'Transformers (Decoder-only or Encoder-Decoder)', 'Generative Adversarial Networks (GAN)', 3, 'easy'),
(1, 1, 2, 'What does the acronym "RLHF" stand for in the context of training LLMs?', 'Reinforcement Learning from Human Feedback', 'Randomized Linear Hierarchical Feedback', 'Reinforcement Learning for Hyperparameter Fine-tuning', 'Recursive Logical Human Filtering', 1, 'easy'),
(1, 1, 3, 'Which organization originally released the seminal paper "Attention Is All You Need" in 2017?', 'OpenAI', 'Google Research', 'Meta AI', 'Stanford University', 2, 'medium'),
(1, 1, 4, 'What is the "context window" of a Large Language Model?', 'The visual window displaying generation logs', 'The maximum number of tokens the model can process in a single run', 'The software application used to input prompts', 'The period of time the model is allowed to process a request', 2, 'easy'),
(1, 1, 5, 'What is it called when an LLM outputs information that is grammatically correct but factually fabricated or unrelated to the prompt?', 'Overfitting', 'Underfitting', 'Hallucination', 'Gradient Exploding', 3, 'easy');

-- TOPIC 2: AI Image
INSERT INTO questions (topic_id, round_number, question_number, question_text, option_1, option_2, option_3, option_4, correct_option, difficulty) VALUES
(2, NULL, 1, 'What primary generative framework is Midjourney based on?', 'Generative Adversarial Networks (GAN)', 'Diffusion Models', 'Variational Autoencoders (VAE)', 'Autoregressive Transformers', 2, 'easy'),
(2, NULL, 2, 'What system does OpenAI''s DALL-E 3 use to translate a user''s concise prompt into a detailed image generation prompt?', 'GPT-4', 'Midjourney API', 'CLIP embeddings', 'Stable Diffusion back-end', 1, 'medium'),
(2, NULL, 3, 'In the context of diffusion models, what is the reverse generation process called?', 'Adding noise', 'Denoising / Reverse Diffusion', 'Vector Quantization', 'Backpropagation', 2, 'easy'),
(2, NULL, 4, 'Which component in a Latent Diffusion Model (like Stable Diffusion) is responsible for compressing pixel-space images into a lower-dimensional latent space?', 'The Vocoder', 'The CLIP Text Encoder', 'The Variational Autoencoder (VAE)', 'The U-Net', 3, 'hard'),
(2, NULL, 5, 'What does the "CFG scale" (Classifier-Free Guidance) control during stable diffusion image generation?', 'The dimensions of the output image', 'How closely the model adheres to the text prompt versus its own creative freedom', 'The number of denoising steps to run', 'The learning rate of the model optimizer', 2, 'medium');

-- TOPIC 3: AI Movie
INSERT INTO questions (topic_id, round_number, question_number, question_text, option_1, option_2, option_3, option_4, correct_option, difficulty) VALUES
(3, NULL, 1, 'Which AI research lab developed the Gen-2 text-to-video and image-to-video AI model?', 'Stability AI', 'Runway', 'OpenAI', 'Midjourney', 2, 'easy'),
(3, NULL, 2, 'What is a common artifact or glitch in AI-generated videos where pixels seem to morph or "swim" inconsistently between frames?', 'Compression noise', 'Temporal inconsistency', 'Aliasing', 'Decimation', 2, 'medium'),
(3, NULL, 3, 'Which model announced in early 2024 generated massive hype by showcasing 60-second highly detailed and consistent videos?', 'Lumiere', 'Sora', 'Emu Video', 'Pika 1.0', 2, 'easy'),
(3, NULL, 4, 'In video generation, what does the term "Inpainting" refer to?', 'Upscaling a video from 1080p to 4K resolution', 'Modifying or editing a specific target area within existing video frames', 'Creating the introductory opening credits automatically', 'Extracting audio tracks from video files', 2, 'easy'),
(3, NULL, 5, 'Which tool or mechanism is commonly used to maintain character face consistency across different scenes in AI movie creation?', 'A high CFG scale', 'LoRA (Low-Rank Adaptation) / IP-Adapter', 'Increasing denoising steps', 'Changing the prompt seeds on every single frame', 2, 'hard');

-- TOPIC 4: AI Music
INSERT INTO questions (topic_id, round_number, question_number, question_text, option_1, option_2, option_3, option_4, correct_option, difficulty) VALUES
(4, NULL, 1, 'Which AI startup launched in late 2023 / early 2024 allowing users to generate full 2-minute songs (vocals + instruments) from text prompts?', 'Suno', 'Stable Audio', 'Udio', 'MuseNet', 1, 'easy'),
(4, NULL, 2, 'What symbolic format is used by AI models like OpenAI''s MuseNet to output notes, velocity, and duration rather than raw audio waves?', 'MP3', 'WAV', 'MIDI', 'FLAC', 3, 'easy'),
(4, NULL, 3, 'In audio diffusion models, what intermediate representation of audio is often generated before being converted to raw audio waves?', 'Mel-Spectrogram', 'Vocal track stem', 'Bitrate envelope', 'Fast Fourier Transform (FFT) complex matrix', 1, 'hard'),
(4, NULL, 4, 'Which direct competitor to Suno, co-founded by former Google DeepMind researchers, launched in early 2024 with state-of-the-art audio quality?', 'Udio', 'MusicLM', 'Beatoven.ai', 'Jukebox', 1, 'medium'),
(4, NULL, 5, 'What is the role of a neural "vocoder" in modern AI audio generation pipelines?', 'To translate lyrics from one language to another', 'To convert a 2D mel-spectrogram back into a 1D raw waveform audio signal', 'To isolate vocals from background instrumentals', 'To add auto-tune pitch correction', 2, 'hard');

-- TOPIC 5: Text-to-Video
INSERT INTO questions (topic_id, round_number, question_number, question_text, option_1, option_2, option_3, option_4, correct_option, difficulty) VALUES
(5, NULL, 1, 'What is the primary technical term for ensuring objects and camera movements flow smoothly and logically over time in a video model?', 'Spatial alignment', 'Temporal coherence', 'Upscale fidelity', 'Denoising sequence', 2, 'medium'),
(5, NULL, 2, 'What neural network architecture combines diffusion models with Transformer blocks, serving as the core of OpenAI''s Sora?', 'Diffusion Transformers (DiT)', 'Generative Recurrent Transformers (GRT)', 'Convolutional Vision Transformers (CViT)', 'Recursive Autoencoder Pools', 1, 'hard'),
(5, NULL, 3, 'Instead of traditional image pixels, what multi-dimensional visual patches does Sora use to train and process video?', 'Spacetime patches', 'Hyper-dimensional slices', 'Chronological segments', 'Gaussian splats', 1, 'hard'),
(5, NULL, 4, 'Which Google-created AI video model uses a space-time U-Net architecture to generate video in a single, coherent pass?', 'VideoPoet', 'Lumiere', 'Imagen Video', 'Phenaki', 2, 'medium'),
(5, NULL, 5, 'What is a major conceptual challenge for current text-to-video models when representing complex physics (like a glass shattering)?', 'They cannot render reflections', 'They do not have a true 3D physical engine and rely entirely on visual pattern correlation', 'They cannot generate high resolution frames', 'They cannot handle cameras moving forwards', 2, 'medium');

-- TOPIC 6: AI Meme
INSERT INTO questions (topic_id, round_number, question_number, question_text, option_1, option_2, option_3, option_4, correct_option, difficulty) VALUES
(6, NULL, 1, 'What is the primary target objective of an AI Meme Generator system?', 'To translate memes into multiple languages', 'To combine image templates with humor-appropriate and contextual caption text', 'To watermark images for copyright protection', 'To delete offensive images from social media', 2, 'easy'),
(6, NULL, 2, 'Which technique is used to place a user''s face onto standard meme characters with high realism?', 'Stable Diffusion Outpainting', 'Face Swapping (e.g. InsightFace / ROOP)', 'Edge detection filter', 'Vector quantization embedding', 2, 'easy'),
(6, NULL, 3, 'What dataset structure is most useful for training a model to understand meme jokes and generate new ones?', 'Raw Wikipedia articles', 'Pairs of meme template images and text descriptions annotated with engagement scores', 'High resolution stock photos', 'Text transcripts of late-night talk shows', 2, 'medium'),
(6, NULL, 4, 'How do advanced AI meme generators utilize text-based LLMs like GPT-4?', 'They use them to compress the image size', 'They prompt the LLM to write witty captions conditioned on the visual layout description', 'They use them to generate 3D objects', 'They use them to clean the database', 2, 'easy'),
(6, NULL, 5, 'In web implementations, how is text usually added to meme templates generated by AI?', 'Drawn dynamically onto coordinates using a Canvas API or Python PIL library', 'Compiled into a separate video file', 'Encoded directly into the image metadata EXIF tags', 'Requires manual user Photoshop input', 1, 'medium');
