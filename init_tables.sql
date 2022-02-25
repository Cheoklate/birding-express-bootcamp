DROP TABLE IF EXISTS species, users, behaviour, notes, comments, notes_behaviour cascade;

CREATE TABLE IF NOT EXISTS species (
  id SERIAL PRIMARY KEY,
  name TEXT,
  scientific_name TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS behaviour (
  id SERIAL PRIMARY KEY,
  action TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  flock_size INTEGER,
  user_id INTEGER REFERENCES users(id),
  species_id INTEGER REFERENCES species(id),
  -- comment_id INTEGER REFERENCES comments(id),
  date TEXT,
  behaviour TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  text TEXT,
  notes_id INTEGER REFERENCES notes(id),
  user_id INTEGER REFERE  NCES users(id)
);

CREATE TABLE IF NOT EXISTS notes_behaviour (
  id SERIAL PRIMARY KEY,
  notes_id INTEGER REFERENCES notes(id),
  behaviour_id INTEGER REFERENCES behaviour(id)
);


  
INSERT INTO species (name, scientific_name) VALUES ('Fried Chicken', 'Friedimus Maximus'), ('Roast Chicken', 'Lorem Ipsum'), ('Beijing Duck', 'Goodbye J'), ('Turducken', 'Monstrous Omegus'), ('Quail', 'Coturnix coturnix'), ('Coconut Chicken','Cocos nucifera'), ('Lemon Chicken', 'Hi JiaChen'), ('Ayam Goreng', 'Pedas pedas'), ('Ayam Penyet', 'Hulkirex Smashidox');
INSERT INTO behaviour(action) VALUES ('bathing'), ('feeding'), ('walking'), ('resting'), ('flocking'), ('climbing tree'), ('drinking'), ('singing'), ('preening'), ('hovering');

-- SELECT notes.id, notes.flock_size, notes.date, users.email, species.name 
--     AS species 
--     FROM notes 
--     INNER JOIN users 
--     ON notes.user_id = users.id 
--     INNER JOIN species 
--     ON species.id = notes.species_id 