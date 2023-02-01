require("dotenv").config(".env");
const cors = require("cors");
const express = require("express");
const app = express();
const morgan = require("morgan");
const { PORT = 3000 } = process.env;
// TODO - require express-openid-connect and destructure auth from it
const { auth } = require("express-openid-connect");
const jwt = require("jsonwebtoken");

const { User, Cupcake } = require("./db");

// middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* *********** YOUR CODE HERE *********** */
// follow the module instructions: destructure config environment variables from process.env
const {
	JWT_SECRET,
	AUTH0_SECRET,
	AUTH0_AUDIENCE = "http://localhost:3000",
	AUTH0_CLIENT_ID,
	AUTH0_BASE_URL,
} = process.env;
// follow the docs:
// define the config object
const config = {
	authRequired: true,
	auth0Logout: true,
	secret: AUTH0_SECRET,
	baseURL: AUTH0_AUDIENCE,
	clientID: AUTH0_CLIENT_ID,
	issuerBaseURL: "https://" + AUTH0_BASE_URL,
};
// attach Auth0 OIDC auth router
app.use(auth(config));

app.use(async (req, res, next) => {
	if (req.oidc.isAuthenticated()) {
		let { name, email, nickname } = req.oidc.user;
		await User.findOrCreate({
			where: {
				username: nickname,
			},
			defaults: {
				name,
				email,
				username: nickname,
			},
		});
	}

	next();
});

// create a GET / route handler that sends back Logged in or Logged out
app.get("/", (req, res) => {
	res.send(req.oidc.isAuthenticated() ? "Logged in" : "Logged out");
});

app.get("/cupcakes", async (req, res, next) => {
	try {
		const cupcakes = await Cupcake.findAll();
		res.send(cupcakes);
	} catch (error) {
		console.error(error);
		next(error);
	}
});

app.get("/me", async (req, res, next) => {
	try {
		const user = await User.findOne({
			where: {
				username: req.oidc.user.nickname,
			},
			raw: true,
		});
		if (!user) {
			return res.sendStatus(401);
		}
		const token = jwt.sign(user, JWT_SECRET, { expiresIn: "1w" });
		res.send({ token, user });
	} catch (error) {
		next(error);
	}
});

// error handling middleware
app.use((error, req, res, next) => {
	console.error("SERVER ERROR: ", error);
	if (res.statusCode < 400) res.status(500);
	res.send({
		error: error.message,
		name: error.name,
		message: error.message,
	});
});

app.listen(PORT, () => {
	console.log(`Cupcakes are ready at http://localhost:${PORT}`);
});
