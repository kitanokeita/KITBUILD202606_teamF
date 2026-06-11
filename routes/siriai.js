var express = require('express');
var router = express.Router();

//DBの読み込み
var sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../siriai.db');

/* GET 知り合い登録画面を表示 */
router.get('/new', function (req, res, next) {
  res.render('siriai/new',{ title: '知り合い登録ページ', name: '', hobby: '', MBTI: '' });
});


/* GET 知り合い登録し、フロントに表示 */
router.post('/new', function (req, res, next) {
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
        hobby: "趣味",
        MBTI: "性格",
        contents: rows
      }
      //form/add.ejsにdataを送る
      res.render('siriai/new', data);
    });
  });
});

/* GET 知り合い一覧を表示 */
router.get('/itiran', function (req, res, next) {
  res.render('siriai/itiran', { title: '知り合い一覧ページ' });
});

/* GET mii作成ページを表示 */
router.get('/new/mii', function (req, res, next) {
  res.render('siriai/mii', { title: 'Mii作成ページ' });
});







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