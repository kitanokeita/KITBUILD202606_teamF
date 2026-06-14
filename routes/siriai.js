var express = require('express');
var router = express.Router();

//DBの読み込み
var sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../siriai.db');

/* 
 *GET 
 *:3000/sirial/new
 * new.ejs 知り合いの登録画面
 * すべての変数は記入欄の初期値
 * name 名前
 * age 年齢
 * hobby 趣味
 * MBTI　mbti
 * /siriai/newにrender
*/
router.get('/new', function (req, res, next) {
  const data = {
    title: "知り合い登録",
    name: "名前",
    age: "19",
    hobby: "趣味",
    MBTI: "mbti"
  }
  res.render('siriai/new', data);
});

/*
 * CREATE TABLE "siriai" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "MBTI" TEXT,
    "hobby" TEXT NOT NULL,
    "hair" INTEGER NOT NULL,
    "eyes" INTEGER NOT NULL,
    "mouth" INTEGER NOT NULL,
    PRIMARY KEY("id" AUTOINCREMENT)
  );
 */
/* POST
 *:3000/siriai/new
 * /siriai/new/miiにredirect
*/
router.post('/new', function (req, res, next) {
  /*
  //siriai.dbからデータを持ってくる
  const sql = 'SELECT * FROM siriai'
  //データベースだけの操作だけでなくそのデータを持ってくるために必要SELECTなど
  db.serialize(() => {
    db.all(sql, (err, rows) => {

      if (err) {
        console.error("データベースにエラー:", err.message);
        return res.status(500).send('データベースにエラーが発生！！:' + err.message);
      }
      //constは変数の箱
      const data = {
        title: "知り合いフォーム",
        content: "新しい知り合いを入力してください",
        name: "名前",
        age: "年齢",
        hobby: "趣味",
        MBTI: "性格",
        contents: rows
      }
        */

      //form/add.ejsにdataを送る
      const data = {
        title: "Mii作成ページ",
        name: req.body["name"],
        age: req.body["age"],
        hobby: req.body["hobby"],
        MBTI: req.body["MBTI"]
      }
      res.render("siriai/mii" , data);
    });
 // });
//});

/* GET 知り合い一覧を表示 */
router.get('/itiran', function (req, res, next) {
  res.render('siriai/itiran', { title: '知り合い一覧ページ' });
});

/* GET mii作成ページを表示 */
router.get('/new/mii', function (req, res, next) {
  res.render('siriai/mii', { title: 'Mii作成ページ' });
});






/**
 * const eye_parts_id = （何かしらでパーツIDを取ってこれる）
if ( eye_parts_id == 1)
　　1パターン目の目の画像をinput 
画像を連番にしておくと、"eye_parts" + eye_parts_id + ".png"
名刺を表示するエンドポイントでは、SELECT文等で、DBから持ってこれる 
getエンドポイント→どの友達の名刺を表示したいのかがわかる（ここで友達IDがわかる）
友達IDをもとに、その友達自体のデータ（名前 / パーツごとのパーツID) 
 */
// /* GET 知り合い一覧をDBから取得して表示 */
// router.get('/', function (req, res, next) {
//   db.all('SELECT * FROM people', [], function (err, rows) {
//     res.render('people/index', { title: '知り合い表示ページ', people: rows });
//   });
// });

// /* POST 知り合いをDBに登録して一覧にリダイレクト */
// router.post('/', function (req, res, next) {
//   var 名前 = req.body['名前'];
//   var 趣味 = req.body['趣味'];
//   var 性格 = req.body['性格'];
//   db.run('INSERT INTO people (名前, 趣味, 性格) VALUES (?, ?, ?)',
//     [名前, 趣味, 性格],
//     function (err) {
//       console.log(err);
//       res.redirect('/people');
//     }
//   );
// });

// /* POST 指定したidの知り合いをDBから削除して一覧にリダイレクト */
// router.post('/:id/delete', function (req, res, next) {
//   var id = req.params.id;
//   db.run('DELETE FROM people WHERE id = ?', [id], function (err) {
//     res.redirect('/people');
//   });
// });

// /* GET 指定したidの知り合いの編集画面を表示 */
// router.get('/:id/edit', function (req, res, next) {
//   var id = req.params.id;
//   db.get('SELECT * FROM people WHERE id = ?', [id], function (err, row) {
//     res.render('people/edit', { person: row });
//   });
// });

// /* POST 指定したidの知り合いの情報をDBで更新して一覧にリダイレクト */
// router.post('/:id/update', function (req, res, next) {
//   var id = req.params.id;
//   var 名前 = req.body['名前'];
//   var 趣味 = req.body['趣味'];
//   var 性格 = req.body['性格'];
//   db.run('UPDATE people SET 名前=?, 趣味=?, 性格=? WHERE id=?',
//     [名前, 趣味, 性格, id],
//     function (err) {
//       console.log(err);
//       res.redirect('/people');
//     }
//   );
// });

module.exports = router;