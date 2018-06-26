# Spotify Together

## Problem

We both had the problem that there isn’t any solution right now for a synchronized playlist together with other people. Spotify themselves have their ‘collaborative playlists’ only then everyone had their own version of the playlist and everyone can play it separately. We wanted something synchronized, easily accessible where the opinion of the users counted.

## Concept

So we came up with Spotify Together. It’s an synchronized playlist where everyone can easily join in and add their favorite songs. Next, people can like songs they “like” to get them higher up the queue.

Spotify Together can be used both by small groups of friends or by businesses. In this case the business setting up their own playlist can change the restrictions so the songs being added to the playlist are monitored. How much freedom you give the users is completely up to the creators of the playlists.

## Café Fest

We pitched the concept to Café Fest which they really liked and they want to use our product when it’s finished. This also means I’m mostly focusing on the context within Café Fest and haven’t worked out the complete product. Otherwise the project would’ve become too big.

After a couple of meetings with Café Fest we noticed Spotify Together could be ideally used when Fest hosts special events. Let’s say Fest is throwing a disco party. They create their playlist, give it a suiting name, and add a restircction that only disco songs are allowed. That’s it. The playlist is made and can be casted to a beamer / monitor.

Next the guests walk into Fest, they see the beamer / monitor and know they can join the playlist. They scan the shown QR code and they are in. Now they can add they favorite songs and like songs to get them higher up the queue.


## Devices

### Desktop

This one was pretty straightforward. The desktop is focused on the creators of the playlists, so in this case Fest. They are able to modify all the settings on the desktop to create their ideal playlists. On the desktop the creator can remove songs, change the settings and accept or reject requested songs (more on this later).

### Beamer

Also known as “the bridge”. The beamer figuratively forms the bridge between the desktop and mobile. When the playlist is created on the desktop they can cast their screen to a beamer where a neat visual is shown to all the guests of Fest. The difference between the beamer and the desktop are their purposes, the beamer communicates what is happening in the playlist to the users. The desktop main purpose is to support the creator with their actions.

### Smartphone

Also, straightforwards. This is the device 99% of the users are going to be using. When the users see the beamer they can scan the displayed QR code and join the playlist within seconds. On their smartphone they can like songs in the playlist and add they favorite songs from their own Spotify account.

## Getting started

1.  Clone the repo `git clone`.
2.  Install dependencies `npm install`.
3.  Run `npm start` to start server on port 3000.

## Features
There are different rights of users and admins. Admins have the more functionality as users but these are additional on the basic functionality. Here you can see the difference in what features they can use.

### Users
- Create a playlist.
- Join a playlist.
- See all active users inside a playlist.
- Add tracks to the playlist.
- Like songs in the playlist.
- Remove your own added songs
- Get information about the currently playing track.

### Admins
- Real time sync player on all connected devices.
- Remove all songs.
- Control the player.
- Change settings of the playlist.
- Set cast mode.

## Setting up Node.js & Express

To get my project running I've started with `npm init` to initialize a `package.json`. From there I started to set-up a `Node.js` directory structure and starting to add different dependencies like `Express` for static file serving and templating.

## Data
This application uses the `Spotify Web Api` as external data source. With this API, my application can retrieve Spotify content such as album data and playlists. To access user-related data through the Web API, an application must be authorized by the user to access that particular information. When the user connect with my application his user data gets fetched to my server and saved in a database. Based on this particular user, more data about his favorite tracks gets loaded and emitted to the client.

### Database system
This application uses mongoDB as database system with mongoose as schema-based model for application data. The database consist the users and a playlist.  When the user connect with my application the server checks if there already is an user present. If so send data from the database, else save that user in the database. Also the playlist is served from the database. When a user adds a playlist, the database gets updated and sets an object with the default properties of a playlist.

### Data life cycle
This is the data model of the application. It shows the communication between the major components of the app.

![preview](datalifecycle.png)

## Authorization
To access user-related data through the Spotify Web API, my application must be authorized by the user to access particular user information. For authorization within my app I've used `passport.js`. This is an authentication middleware for Node.js with different Authentication mechanisms, known as strategies. I used the Passport strategy for authenticating with Spotify using the OAuth 2.0 API. Following this example [https://github.com/jmperez/passport-spotify#readme](https://github.com/jmperez/passport-spotify#readme)
