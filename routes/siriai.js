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
 * hobby 趣味
 * MBTI　mbti
 * /siriai/newにrender
*/
//routerからの場所
router.get('/new', function (req, res, next) {
  const data = {
    title: "知り合い登録",
    name: "名前",
    age: "19",
    hobby: "趣味",
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
        MBTI: req.body["MBTI"],
        hobby: req.body["hobby"],
        errorMessage: ""
      }

      if(! data.name || ! data.MBTI|| !data.age||!data.hobby){
        data.errorMessage = "未入力の項目がありますよ！！すべて入力してね。";
        return res.render("siriai/new" , data)
      }
      res.render("siriai/mii" , data);
    });

/* GET 知り合い一覧を表示 */
/**GET /siriai/itiran
 * 
 */
router.get('/itiran', function (req, res, next) {
  db.all('SELECT * FROM siriai', [], function (err, rows) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.render('siriai/itiran', { title: '知り合い表示ページ', rows });
  });
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
//"INSERT INTO siriai (name , age , MBTI , hobby , hair , eyes , mouth) VALUES (?, ?, ?, ?, ?, ?, ?)"
router.post('/mii', function (req, res, next) {
  const sql = "INSERT INTO siriai (name , age , MBTI , hobby , hair , eyes , mouth) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const data = [
    req.body.name,
    req.body.age, 
    req.body.MBTI,
    req.body.hobby,
    req.body.hair,
    req.body.eyes,
    req.body.mouth
  ];
  db.run(sql,data, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.redirect('/');
  });
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
router.get('/edit', function (req, res, next) {
  // JavaScriptを埋め込んで、5秒カウントダウンしてから移動するHTML
  const html = `
      <h1>まだページを作ってないよ〜〜〜〜〜</h1>
      
      <p><span id="timer" class="countdown">5</span> 秒後に一覧ページに戻ります...</p>

      <script>
        // 残り秒数をセット
        let timeLeft = 5;
        // 数字を表示するHTMLの要素を取得
        const timerElement = document.getElementById('timer');
        
        // setIntervalを使って、1000ミリ秒（1秒）ごとに中の処理を繰り返す
        const countdown = setInterval(function() {
          timeLeft--; // 1減らす
          timerElement.textContent = timeLeft; // 画面の数字を書き換える
          
          // 0秒になったら
          if (timeLeft <= 0) {
            clearInterval(countdown); // カウントダウンのタイマーを止める
            window.location.href = '/siriai/itiran'; // 一覧ページへ移動！
          }
        }, 1000);
      </script>
  `;
  
  res.status(404).send(html);
});




// 以下はメモ書き
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