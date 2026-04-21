var express = require('express');
var router = express.Router();
const db = require('../db/db.js');

function captureRouteParams(req, res, next) {
    res.locals.routeParams = { ...req.params };
    next();
}

// GET ALL
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tours');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

// GET
router.get('/:id', captureRouteParams, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM tours WHERE tour_id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).send('Tour not found');
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

// POST
router.post('/', async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send('Missing fields');
        }

        const { hotel_id, duration_weeks, base_price } = req.body;

        if (!hotel_id || !duration_weeks || !base_price) {
            return res.status(400).send('Missing fields');
        }

        const [result] = await db.query(
            'INSERT INTO tours (hotel_id, duration_weeks, base_price) VALUES (?, ?, ?)',
            [hotel_id, duration_weeks, base_price]
        );

        res.status(201).json({
            message: 'Tour created',
            id: result.insertId
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error');
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const [result] = await db.query(
            'DELETE FROM tours WHERE tour_id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send('Tour not found');
        }

        return res.status(204).send();

    } catch (err) {
        console.error(err);
        return res.status(500).send('Database error');
    }
});

module.exports = router;