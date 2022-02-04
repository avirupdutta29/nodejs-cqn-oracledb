const express = require('express');
const app=express();
const http = require('http');
const oracledb = require('oracledb');
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server);
const { Client } = require('oracledb');
var port = process.env.PORT || 3000;


let dbConfig = {
  user: 'system',
  password: 'Oracle123',
  connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.17.0.2)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=SEPDB)(SERVER=DEDICATED)(SID=prod1)))",
  events: true  // CQN needs events mode
}

process
.on('SIGTERM', function() {
  console.log("\nTerminating");
  process.exit(0);
})
.on('SIGINT', function() {
  console.log("\nTerminating");
  process.exit(0);
});


async function getData() {
  // let sql = `SELECT ID, DESCRIPTION, TITLE
  //              FROM C##COURSE20.COURSES
  //              ORDER BY ID DESC
  //              FETCH NEXT :rowcount ROWS ONLY`;
             

  let sql = `CREATE OR REPLACE TRIGGER C##COURSE20.update_courses 
  BEFORE INSERT OR UPDATE ON C##COURSE20.COURSES 
  FOR EACH ROW 
  BEGIN
    DBMS_OUTPUT.PUT_LINE('Record Inserted.');
  END;`;


  //let binds = [5];  // get 5 most recent messages
  //let options = { outFormat: oracledb.OBJECT };

  let conn = await oracledb.getConnection();
  let result = await conn.execute(sql);
  await conn.close();
  return result.rows;
}

// Method invoked whenever some data in the registered table changes
async function myCallback(message) {
  let rows = await getData();
  console.log(rows);
  io.emit('message', JSON.stringify(rows));
}


let connection;
//var oracledb = require('oracledb');

// (async function() {
// try{
//    connection = await oracledb.getConnection({
//         user : 'system',
//         password : 'Oracle123',
//         database : 'courses',
//         connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.17.0.2)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=SEPDB)(SERVER=DEDICATED)(SID=prod1)))"
//    });
//    console.log("Successfully connected to Oracle!")
  

// } catch(err) {
//     console.log("Error: ", err);
//   } finally {
//     if (connection) {
//       try {
//         await connection.close();
//       } catch(err) {
//         console.log("Error when closing the database connection: ", err);
//       }
//     }
//   }
// })()


async function startOracle() {
  let conn;

  try {
    await oracledb.createPool(dbConfig);

    conn = await oracledb.getConnection();
    await conn.subscribe('mysub', {
      callback: myCallback,
      sql:      "SELECT * FROM C##COURSE20.COURSES"  // the table to watch
    });
    console.log("CQN subscription created");

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html');
// });

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
      console.log('user disconnected');
  });
  
});


  app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
  });


server.listen(3000, () => {
  console.log('Server running on port 3000');
})

// async function ws() {
//   app.get('/', function(req, res){
//     res.sendFile(__dirname + '/index.html');
//   });

//   http.listen(port, function(){
//     console.log('Listening on http://localhost:' + port);
//   });
// }

// Do it
async function run() {
  await startOracle();
  
}

run();