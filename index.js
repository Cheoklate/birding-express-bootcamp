import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';

const SALT = 'Hire an assassin to kill me please';

const { Pool } = pg;

let pgConnectionConfigs;
pgConnectionConfigs = {
	user: 'gcheok',
	host: 'localhost',
	database: 'gcheok',
	port: 5432,
};

const pool = new Pool(pgConnectionConfigs);

const app = express();
const PORT = 3004;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

app.get('/note', (req, res) => {
	const speciesQuery = 'SELECT * FROM species';
	pool.query(speciesQuery, (speciesQueryError, speciesQueryResult) => {
		if (speciesQueryError) {
		} else {
			const data = {
				species: speciesQueryResult.rows,
			};
			res.render('note', data);
		}
	});
});

app.post('/note', (req, res) => {
	const entryQuery =
		'INSERT INTO notes (flock_size, date, user_id, species_id) VALUES ($1, $2, $3, $4) returning id';

	const birdData = req.body;

	const inputData = [
		Number(birdData.flock_size),
		birdData.date,
		Number(req.cookies.userId),
		Number(birdData.species_id),
	];

	pool.query(entryQuery, inputData, (entryError, entryResult) => {
		if (entryError) {
		} else {
			const noteId = entryResult.rows[0].id;

			birdData.behaviour.forEach((behaviour) => {
				const behaviourIdQuery = `SELECT id FROM behaviour WHERE action = '${behaviour}'`;

				pool.query(
					behaviourIdQuery,
					(behaviourIdQueryError, behaviourIdQueryResult) => {
						if (behaviourIdQueryError) {
						} else {
							const behaviourId = behaviourIdQueryResult.rows[0].id;
							const behaviourData = [noteId, behaviourId];

							const notesBehaviourEntry =
								'INSERT INTO notes_behaviour (notes_id, behaviour_id) VALUES ($1, $2)';

							pool.query(
								notesBehaviourEntry,
								behaviourData,
								(notesBehaviourEntryError, notesBehaviourEntryResult) => {
									if (notesBehaviourEntryError) {
									} else {
									}
								}
							);
						}
					}
				);
			});
			res.redirect('/');
		}
	});
});

app.get('/note/:id', (req, res) => {
	const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
	const unhashedCookieString = `${req.cookies.userId}-${SALT}`;
	shaObj.update(unhashedCookieString);
	const hashedCookieString = shaObj.getHash('HEX');
	if (req.cookies.loggedInHash !== hashedCookieString) {
		res.status(403).send('please log in');
	} else {
		const { id } = req.params;
		const singleNote = `SELECT notes.id, notes.flock_size, notes.date, users.email, species.name 
    AS species 
    FROM notes 
    INNER JOIN users 
    ON notes.user_id = users.id 
    INNER JOIN species 
    ON species.id = notes.species_id 
    WHERE notes.id = ${id}`;

		pool.query(singleNote, (singleNoteError, singleNoteResult) => {
			if (singleNoteError) {
			} else {
				const oneNote = singleNoteResult.rows[0];
				const { loggedIn } = req.cookies;
				res.render('single-note', { eachNote: oneNote, loggedIn });
			}
		});
	}
});

app.get('/', (req, res) => {
	const allQuery =
		'SELECT notes.id, notes.behaviour, notes.flock_size, notes.user_id, notes.species_id, notes.date, species.name FROM notes INNER JOIN species ON notes.species_id = species.id';
	pool.query(allQuery, (allQueryError, allQueryResult) => {
		if (allQueryError) {
		} else {
			const allNotes = allQueryResult.rows;
			const { loggedIn } = req.cookies;
			res.render('landing-page', { allNotes, loggedIn });
		}
	});
});

app.get('/note/:id/edit', (req, res) => {
	const noteId = Number(req.params.id);
	const getNoteInfoQuery = `SELECT * 
  FROM notes 
  WHERE id = ${noteId}`;
	pool.query(
		getNoteInfoQuery,
		(getNoteInfoQueryError, getNoteInfoQueryResult) => {
			if (getNoteInfoQueryError) {
			} else {
				const noteInfo = getNoteInfoQueryResult.rows[0];
				if (noteInfo.user_id === Number(req.cookies.userId)) {
					const speciesQuery = 'SELECT * FROM species';
					pool.query(speciesQuery, (speciesQueryError, speciesQueryResult) => {
						if (speciesQueryError) {
						} else {
							const data = {
								species: speciesQueryResult.rows,
							};

							const editBehaviourQuery = `SELECT behaviour.action 
              FROM behaviour 
              INNER JOIN notes_behaviour ON behaviour.id = notes_behaviour.behaviour_id 
              WHERE notes_id = ${noteId}`;

							pool.query(
								editBehaviourQuery,
								(editBehaviourQueryError, editBehaviourQueryResult) => {
									if (editBehaviourQueryError) {
									} else {
										const behaviourArray = [];
										const behaviours = editBehaviourQueryResult.rows;
										behaviours.forEach((behaviour) => {
											behaviourArray.push(behaviour.action);
										});
										const displayBehavioursQuery = 'SELECT * FROM behaviour';

										pool.query(
											displayBehavioursQuery,
											(
												displayBehavioursQueryError,
												displayBehavioursQueryResult
											) => {
												if (displayBehavioursQueryError) {
												} else {
													const allBehaviour =
														displayBehavioursQueryResult.rows;

													res.render('edit', {
														noteInfo,
														data,
														behaviourArray,
														allBehaviour,
													});
												}
											}
										);
									}
								}
							);
						}
					});
				} else {
					res.send('You are not authorised to edit this post. ');
				}
			}
		}
	);
});

app.put('/note/:id/edit', (req, res) => {
	const id = Number(req.params.id);

	const editEntryQuery = `UPDATE notes SET behaviour = '${
		req.body.behaviour
	}', flock_size = ${Number(req.body.flock_size)}, date = '${
		req.body.date
	}', species_id = ${Number(req.body.species_id)} WHERE id = ${id} RETURNING *`;

	pool.query(editEntryQuery, (editEntryQueryError, editEntryQueryResult) => {
		if (editEntryQueryError) {
		} else {
			res.redirect('/');
		}
	});
});

app.delete('/note/:id/delete', (req, res) => {
	const noteId = Number(req.params.id);
	const getNoteInfoQuery = `SELECT * FROM notes WHERE id = ${noteId}`;
	pool.query(
		getNoteInfoQuery,
		(getNoteInfoQueryError, getNoteInfoQueryResult) => {
			if (getNoteInfoQueryError) {
			} else {
				const noteInfo = getNoteInfoQueryResult.rows[0];
				if (noteInfo.user_id === Number(req.cookies.userId)) {
					const deleteNoteQuery = `DELETE FROM notes WHERE id = ${noteId}`;
					pool.query(deleteNoteQuery, (deleteNoteError, deleteNoteResult) => {
						if (deleteNoteError) {
						} else {
							res.redirect('/');
						}
					});
				} else {
					res.send('You are not authorised to delete this post. ');
				}
			}
		}
	);
});

app.get('/signup', (req, res) => {
	const { loggedIn } = req.cookies;
	res.render('sign-up', { loggedIn });
});

app.post('/signup', (req, res) => {
	const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

	shaObj.update(req.body.password);

	const hashedPassword = shaObj.getHash('HEX');

	const newUserQuery = 'INSERT INTO users (email, password) VALUES ($1, $2)';
	const inputData = [req.body.email, hashedPassword];

	pool.query(
		newUserQuery,
		inputData,
		(newUserQueryError, newUserQueryResult) => {
			if (newUserQueryError) {
			} else {
				res.redirect('/login');
			}
		}
	);
});

app.get('/login', (req, res) => {
	const { loggedIn } = req.cookies;
	res.render('login', { loggedIn });
});

app.post('/login', (req, res) => {
	pool.query(
		`SELECT * FROM users WHERE email = '${req.body.email}'`,
		(emailQueryError, emailQueryResult) => {
			if (emailQueryError) {
				res.status(503).send('request not successful');
				return;
			}

			if (emailQueryResult.rows.length === 0) {
				res.status(403).send('not successful');
				return;
			}

			const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
			shaObj.update(req.body.password);
			const hashedPassword = shaObj.getHash('HEX');
			if (emailQueryResult.rows[0].password === hashedPassword) {
				res.cookie('loggedIn', true);

				const shaObj1 = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
				const unhashedCookieString = `${emailQueryResult.rows[0].id}-${SALT}`;
				shaObj1.update(unhashedCookieString);
				const hashedCookieString = shaObj1.getHash('HEX');
				res.cookie('loggedInHash', hashedCookieString);
				res.cookie('userId', emailQueryResult.rows[0].id);
				res.redirect('/');
			} else {
				res.status(403).send('not successful');
			}
		}
	);
});

app.delete('/logout', (req, res) => {
	res.clearCookie('loggedIn');
	res.clearCookie('userId');
	res.clearCookie('loggedInHash');
	res.redirect('/login');
});

app.get('/species', (req, res) => {
	res.render('species-form');
});

app.post('/species', (req, res) => {
	const inputSpeciesQuery =
		'INSERT INTO species (name, scientific_name) VALUES ($1, $2)';

	const inputData = [req.body.name, req.body.scientific_name];

	pool.query(
		inputSpeciesQuery,
		inputData,
		(inputSpeciesQueryError, inputSpeciesQueryResult) => {
			if (inputSpeciesQueryError) {
			} else {
				res.redirect('/');
			}
		}
	);
});

app.get('/species/all', (req, res) => {
	const getSpeciesInfo = 'SELECT * FROM species';

	pool.query(getSpeciesInfo, (getSpeciesInfoError, getSpeciesInfoResult) => {
		if (getSpeciesInfoError) {
		} else {
			const speciesInfo = getSpeciesInfoResult.rows;
			res.render('all-species', { speciesInfo });
		}
	});
});

app.get('/users/:id', (req, res) => {
	const usersId = Number(req.params.id);

	const getUserEntriesQuery = `SELECT notes.id, notes.flock_size, notes.date, species.name FROM notes INNER JOIN species ON notes.species_id = species.id INNER JOIN users ON notes.user_id = users.id WHERE users.id = ${usersId}`;

	pool.query(
		getUserEntriesQuery,
		(getUserEntriesQueryError, getUserEntriesQueryResult) => {
			if (getUserEntriesQueryError) {
			} else {
				const userNotes = getUserEntriesQueryResult.rows;
				res.render('user-page', { userNotes });
			}
		}
	);
});

app.get('/behaviour', (req, res) => {
	const allBehaviourQuery = 'SELECT * FROM behaviour';

	pool.query(
		allBehaviourQuery,
		(allBehaviourQueryError, allBehaviourQueryResult) => {
			if (allBehaviourQueryError) {
			} else {
				const data = allBehaviourQueryResult.rows;
				res.render('behaviours', { data });
			}
		}
	);
});

app.get('/behaviour/:id', (req, res) => {
	const behaviourId = req.params.id;

	const behaviourQuery = `SELECT * FROM notes INNER JOIN notes_behaviour ON notes.id = notes_behaviour.notes_id INNER JOIN species ON notes.species_id = species.id WHERE behaviour_id = ${behaviourId}`;

	pool.query(behaviourQuery, (behaviourQueryError, behaviourQueryResult) => {
		if (behaviourQueryError) {
		} else {
			const data = behaviourQueryResult.rows;
			res.render('behaviour-notes', { data });
		}
	});
});

app.post('/note/:id/comment', (req, res) => {
	const { userId } = req.cookies;

	const notesId = req.params.id;
	const text = req.body.comment;

	const addCommentQuery =
		'INSERT INTO comments (text, notes_id, user_id) VALUES ($1, $2, $3)';
	const inputData = [`'${text}'`, notesId, userId];

	pool.query(
		addCommentQuery,
		inputData,
		(addCommentQueryError, addCommentQueryResult) => {
			if (addCommentQueryError) {
			} else {
				res.redirect('/');
			}
		}
	);
});

app.listen(PORT);
