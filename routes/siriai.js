const { name } = require('ejs');
var express = require('express');
var router = express.Router();

//DBの読み込み
var sqlite3 = require('sqlite3');
const db = new sqlite3.Database('siriai.db');

/* 
 *GET 
 *:3000/sirial/new
 * new.ejs 知り合いの登録画面
 * すべての変数は記入欄の初期値
 * name 名前
 * age 年齢
 * relation 関係
 * hobby 趣味
 * MBTI　mbti
 * /siriai/newにrender
*/
//routerからの場所
router.get('/new', function (req, res, next) {
  const data = {
    title: "知り合い登録",
    name: "",
    age: "",
    relation: "",
    hobby: "",
    MBTI: "mbti",
    errorMessage: ""
  }
  //ファイル
  res.render('siriai/new', data);
});


/* POST
 *:3000/siriai/new
 * /siriai/new/miiにredirect
*/
router.post('/new', function (req, res, next) {
  //form/add.ejsにdataを送る
  const data = {
    title: "Mii作成ページ",
    name: req.body["name"],
    age: req.body["age"],
    relation: req.body["relation"],
    MBTI: req.body["MBTI"],
    hobby: req.body["hobby"],
    errorMessage: ""
  }

  if (!data.name || !data.age || !data.relation || !data.hobby || !data.MBTI) {
    var errorplace = [];
    if (!data.name) errorplace.push("名前");
    if (!data.age) errorplace.push("年齢");
    if (!data.relation) errorplace.push("関係");
    if (!data.hobby) errorplace.push("趣味");
    if (!data.MBTI) errorplace.push("MBTI");

    data.errorMessage = `${errorplace.join(",")}` + "の欄が未入力ですよ！！すべて入力してね。";
    return res.render("siriai/new", data)
  }
  res.render("siriai/mii", data);
});

/* GET 知り合い一覧を表示 */
/**GET /siriai/itiran
 * 
 */
router.get('/itiran', function (req, res, next) {
  // favorite の降順にすることでお気に入り（1）が上に表示される
  db.all('SELECT * FROM siriai ORDER BY favorite DESC', [], function (err, rows) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.render('siriai/itiran', { title: '知り合い表示ページ', rows });
  });
});

/**
 * /siriai/に間違えて送ってしまった時の対処
 */
router.get('/', function (req, res, next) {
  res.redirect('/');
});

/* POST mii作成ページを表示 */
/**
 * 作成した知り合いを保存するエンドポイント
 * /siriai/mii
 * name
 * age
 * hobby
 * MBTI
 * Miiを保存
 * localhost3000:にリダイレクト
 */
//"INSERT INTO siriai (name , age , MBTI , hobby , hair , eyes , mouth) VALUES (?, ?, ?, ?, ?, ?, ?)"
router.post('/mii', function (req, res, next) {
  const sql = "INSERT INTO siriai (user_id, name , age , relation, MBTI , hobby , hair , eyes , mouth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const data = [
    req.user.id,
    req.body.name,
    req.body.age,
    req.body.relation,
    req.body.MBTI,
    req.body.hobby,
    req.body.hair,
    req.body.eyes,
    req.body.mouth
  ];
  db.run(sql, data, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.redirect('/');
  });
});

/**
 * AI読み込み機能
 */
router.post('/ai', function (req, res, next) {
  const data = {
    title: "AIアバター作成",
    name: req.body.name,
    age: req.body.age,
    relation: req.body.relation,
    MBTI: req.body.MBTI,
    hobby: req.body.hobby,
  };
  res.render('siriai/ai', data);
});

/* POST 指定したidの知り合いをDBから削除して一覧にリダイレクト */
router.get('/delete', function (req, res, next) {
  var id = req.query.id;
  db.run('DELETE FROM siriai WHERE id = ?', [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }

    res.redirect('/siriai/itiran');
  });
});

/* GET 指定したidの知り合いの編集画面を表示 */
//編集画面が必要
//?はプレースホルダ
router.get('/edit', function (req, res, next) {
  var id = req.query.id; //URLの ?id= の部分を取得
  db.get('SELECT * FROM siriai WHERE id = ?', [id], function (err, row) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.render('siriai/edit', {
      title: '知り合い更新',
      id: row.id,
      name: row.name,
      age: row.age,
      relation: row.relation,
      hobby: row.hobby,
      MBTI: row.MBTI,
      errorMessage: ""
    });
  });
});

router.post('/edit', function (req, res, next) {
  var id = req.body.id;
  db.run('UPDATE siriai SET name=?, age=?, MBTI=?, hobby=? WHERE id=?',
    [req.body.name, req.body.age, req.body.relation, req.body.MBTI, req.body.hobby, id],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send('データベースエラー');
      }
      res.redirect('/siriai/itiran');
    });
});

/* GET お気に入りトグル
 * /siriai/favorite?id=3
 * クリックするたびに favorite を 0（なし）↔ 1（あり）で切り替える
 * 切り替え後は一覧ページにリダイレクト
 */
router.get('/favorite', function (req, res, next) {
  var id = req.query.id; // URLの ?id=

  // 今のfavoriteの値をDBから取得
  db.get('SELECT favorite FROM siriai WHERE id = ?', [id], function (err, row) {

    // 今が1なら0、今が0なら1に反転（トグル）
    var newFavorite = row.favorite === 1 ? 0 : 1;

    // 反転した値でDBを更新
    db.run('UPDATE siriai SET favorite = ? WHERE id = ?', [newFavorite, id], function (err) {
      res.redirect('/siriai/itiran');
    });
  });
});

module.exports = router;