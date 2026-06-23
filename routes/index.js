var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var passport = require('passport');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./siriai.db');

/**
 * トップページの表示
 * * 通信方式: GET通信
 * サーバーから情報を取得するための通信方式です。ブラウザのURL直接入力やリンクのクリックで実行されます。
 * * 処理内容:
 * トップページの画面を生成して表示します。
 * req.user を画面側(index.ejs)に渡すことで、EJS側でログイン状態か未ログインか、誰がログインしているかを判定して表示を切り替えられるようにしています。
 * * @param {Object} req - Expressリクエストオブジェクト
 * @param {Object} res - Expressレスポンスオブジェクト。res.renderでindex.ejsをHTMLに変換しブラウザに送信します。
 * @param {Function} next - 次のミドルウェアを呼び出すコールバック関数
 */
router.get('/', function(req, res, next) {
  res.render('index', { 
    title: '知り合いコレクション',
    user: req.user 
  });
});

/**
 * 新規登録画面の表示
 * * 通信方式: GET通信
 * 入力フォームの画面をサーバーから取得するための通信です。
 * * 処理内容:
 * ユーザー名とパスワードを入力するための新規登録画面を表示します。
 * * @param {Object} req - Expressリクエストオブジェクト
 * @param {Object} res - Expressレスポンスオブジェクト。res.renderでregister.ejsをブラウザに送信します。
 * @param {Function} next - 次のミドルウェアを呼び出すコールバック関数
 */
router.get('/register', function(req, res, next) {
  res.render('register');
});

/**
 * 新規登録のデータ処理
 * * 通信方式: POST通信
 * フォームに入力されたデータをサーバーに送信するための通信方式です。URLに送信データが表示されないため、パスワードなどの秘匿性の高い情報を安全に送る際に使われます。
 * * 処理内容:
 * 新規登録画面から送られてきたユーザー名とパスワードを受け取り、データベースに保存します。
 * 送られてきたパスワード(req.body.password)はそのまま保存せず、bcryptを使って復元不可能な暗号(ハッシュ)に変換します。
 * その後、データベースの users テーブルに新規保存(INSERT)します。
 * * @param {Object} req - Expressリクエストオブジェクト。req.body.usernameとreq.body.passwordに送信データが格納されます。
 * @param {Object} res - Expressレスポンスオブジェクト。保存成功時はres.redirectでログイン画面へ、失敗時は登録画面へ強制移動させます。
 * @param {Function} next - 次のミドルウェアを呼び出すコールバック関数
 */
router.post('/register', async function(req, res, next) {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [req.body.username, hashedPassword], function(err) {
      if (err) {
        console.error("登録エラー:", err.message);
        return res.redirect('/register');
      }
      res.redirect('/login');
    });
  } catch (error) {
    console.error("サーバーエラー:", error);
    res.redirect('/register');
  }
});

/**
 * ログイン画面の表示
 * * 通信方式: GET通信
 * ログイン用の入力フォーム画面をサーバーから取得するための通信です。
 * * 処理内容:
 * ログイン画面を表示します。
 * * @param {Object} req - Expressリクエストオブジェクト
 * @param {Object} res - Expressレスポンスオブジェクト。res.renderでlogin.ejsをブラウザに送信します。
 * @param {Function} next - 次のミドルウェアを呼び出すコールバック関数
 */
router.get('/login', function(req, res, next) {
  res.render('login');
});

/**
 * ログインのデータ処理
 * * 通信方式: POST通信
 * ログイン画面で入力されたユーザー名とパスワードをサーバーに送信して、認証を依頼するための通信です。
 * * 処理内容:
 * 送られてきたユーザー情報とデータベースの情報を照合して、ログインの成功・失敗を判定します。
 * passport.authenticate('local')により、app.jsで設定したデータベースとのパスワード照合処理を呼び出します。
 * * @param {Object} req - Expressリクエストオブジェクト
 * @param {Object} res - Expressレスポンスオブジェクト。照合成功時はトップページへ、失敗時は再度ログイン画面へリダイレクトさせます。
 * @param {Function} next - 次のミドルウェアを呼び出すコールバック関数
 */
//localとはapp.jsのnew Localの部分を使ってる
router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
}));

/**
 * ログアウト処理
 * * 通信方式: GET通信
 * ログアウト処理(セッションの破棄)をサーバーに要求するための通信です。リンクをクリックすることで実行されます。
 * * 処理内容:
 * 現在ログインしているユーザーのセッション(ログイン状態の記憶)を削除して、未ログイン状態に戻します。
 * req.logoutというPassportの機能でサーバー上のログイン証明を破棄します。
 * * @param {Object} req - Expressリクエストオブジェクト
 * @param {Object} res - Expressレスポンスオブジェクト。破棄完了後、トップページへリダイレクトさせます。
 * @param {Function} next - 次のミドルウェアを呼び出すコールバック関数
 */
router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

module.exports = router;