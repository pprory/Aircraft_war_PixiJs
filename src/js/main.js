let _Main = null,app,su;
function load(){
    app = new PIXI.Application({
        width:$('.app').width(),
        height:$('.app').height(),
        antialiasing: true,   
        transparent: false, 
        resolution: 1
    })
    su = new SpriteUtilities(PIXI);
    PIXI.loader.add([
        'images/snow.png', //雪花图
        // 'images/map.jpg',  //森林地图
        // 'images/map1.jpg', //沙漠图
        'images/map2.jpg', //冰河地图
        'images/ace.png',  //飞机图
        'images/bullet.png',//子弹图
        'images/bullet2.png',//子弹图
        'images/enemy1.png',//敌军
        'images/boom.png',//爆炸
    ]).load(function(){
        document.querySelector('.app').appendChild(app.view);
        _Main = new Main();
        _Main.init();
        $('.load-container').fadeOut(800,()=>{
        });
        $('.ranking-list-box').fadeIn(800);
        $('.start-btn').click(()=>{
            if(_Main.integral.health === 0){
                _Main.restart();
            }else{
                _Main.start();
            }
            $('.ranking-list-box').hide();
        })
    })
    PIXI.loader.onProgress.add( function(loader,resources){
        console.log('加载'+loader.progress+'%');
        $('.progress').html(loader.progress.toFixed(2));
    })
}
class Main{
    constructor() {
        this.userName = localStorage.getItem('_userinfo') || null;
        this.container= new PIXI.Container();
        this.ParticleContainer = new PIXI.ParticleContainer();
        this.initYSpeed = 1;
        this.snowPond = []; //雪花池
        
        this.map = null; //地图
        this.mapInit = null;  //地图精灵

        this.aricraft = new Aricraft();
        this.aricraftSprite = this.aricraft.init();

        this.bullet = new Bullet(); //子弹实例
        this.bulletArr = []; //子弹池

        this.enemy = new Enemy(); //敌军实例
        this.enemyArr = []; //敌军池
        this.enemyRefreshSpeed = 1000; //敌军刷新速度
        this.integral = {
            value:0, //积分
            health:100 //健康值
        }; 
        this.healthColor={
            healthy:{
                r:2,
                g:190,
                b:25,
            },
            enough:{
                r:173,
                g:198,
                b:34,
            },
            general:{
                r:255,
                g:180,
                b:43,
            },
            danger:{
                r:255,
                g:25,
                b:25,
            }
        }
        this.timer = null; //敌军定时器
        this.enemy_bulletArr = [];//敌军子弹池

        this.boom = new Boom(); //爆炸
        
    }
    init (){
        this.createMap(); //创建地图
        this.createSnow();//创建雪花粒子
        this.setIntegral(0);
        app.stage.addChild(this.ParticleContainer);
        app.ticker.add( delta => {
            this.play();
        })
        // this.start();     //开始
    }
    start (){
        this.createAricraft();//创建飞机
        this.aricraft.setInvincible(); //开启无敌模式
        this.createEnemy();// 创建敌机
        toast('游戏开始');
    }
    play (){
        /* 雪花 */
        this.snowPond.forEach(item=>{
            item.y+=item.width/5;
            item.x+=-0.2;
            item.rotation += 0.01 + 0.01/item.width;
            item.ResetPosition(item);
        })
        /* 地图 */
        this.mapInit.tilePosition.y+=3;

        /* 飞机位置 */
        this.aricraftSprite.position.x += this.aricraftSprite.vx;
        this.aricraftSprite.position.y += this.aricraftSprite.vy;
        this.boundaryLimit(this.aricraftSprite); //限制飞出屏幕

        /* 子弹位置 */
        this.bulletArr.forEach( (item,index) => {
            item.position.y += item.vy;
            if(item.isDest){
                item.alpha = 0;
                this.bulletArr.splice(index,1)
                this.container.removeChild(item);
            }else if(item.position.y<0){
                // 销毁子弹
                this.container.removeChild(item);
                this.bulletArr.splice(index,1)
            } 
        })      
        /* 敌军位置 */
        this.enemyArr.forEach( (item,index) => {
            item.position.y+=item.vy;
            if(item.health === 0){
                this.setIntegral(1);
                item.alpha = 0;
                this.enemyArr.splice(index,1);
                // item.visible = false;
                // 爆炸效果

                this.boomPlay(item.position.x + item.width / 2 , item.position.y + item.height / 2 + 15);
                this.ParticleContainer.removeChild(item);
            }
            if(item.position.y>$('.app').height()){
                this.container.removeChild(item);
                clearInterval(item.timer);
                this.enemyArr.splice(index,1)
            }
            this.bulletArr.forEach( bullet => {
                if(item.health === 0) return;
                if(hitTestRectangle(bullet,item)){
                    // this.ParticleContainer.removeChild(bullet);
                    // this.container.removeChild(item);
                    bullet.isDest = true;
                    item.health -= 1;
                }
            })
            /* 飞机碰撞 */
            if((!this.aricraftSprite.isInvincible) && hitTestRectangle(item,this.aricraftSprite)){
                this.setHealth();
            }
        })

        /* 敌军子弹 */
        this.enemy_bulletArr.forEach( (item,index) => {
            item.position.x += item.vx;
            item.position.y += item.vy;
            if(item.position.y>$('.app').height()+20 || item.position.y<-20 || item.position.x>$('.app').width()+20 || item.position.x < -20){
                this.enemy_bulletArr.splice(index,1);
                this.ParticleContainer.removeChild(item);
            }
            if(!item.isDest&&(!this.aricraftSprite.isInvincible)&&hitTestRectangle(item,this.aricraftSprite)){
                item.isDest = true;
                this.enemy_bulletArr.splice(index,1);
                this.ParticleContainer.removeChild(item);

                this.setHealth();
            }
        })
    }
    /* 创建雪花 */
    createSnow (){
        console.log('创建雪花')
        let _sonw = new Snow();
        for(let i=0;i<30;i++){
            let _item = _sonw.rendererSnow(
                Math.random()*$('.app').width()+30,
                -50,
                Math.random()*30,
                Math.random()*1
            )
            this.snowPond.push(_item)
            this.container.addChild(_item);
        }
        app.stage.addChild(this.container);
    }
    /* 创建地图 */
    createMap (){
        console.log('创建地图')
        this.map = new Map();
        this.mapInit = this.map.init();
        this.container.addChild(this.mapInit) 
        // button.buttonMode = true;
        // this.mapInit.interactive = true;
    }
    /* 创建飞机 */
    createAricraft (){
        // this.aricraftSprite
        this.aricraftSprite.scale.x = 0.6;
        this.aricraftSprite.scale.y = 0.6;
        this.aricraftSprite.position.x = $('.app').width() / 2 - this.aricraftSprite.width/2;
        this.aricraftSprite.position.y = $('.app').height() - this.aricraftSprite.height - 30;
        this.container.addChild(this.aricraftSprite);

        this.aricraftSprite.interactive = true;
        this.aricraftSprite.on('pointerdown',()=>{
            let isfire = true;
            this.aricraftSprite.on('pointermove',(_e)=>{
                let _x = _e.data.global.x;
                let _y = _e.data.global.y;
                this.aricraftSprite.position.set(_x - this.aricraftSprite.width/2,_y - this.aricraftSprite.height/2);
                if(isfire){
                    isfire = false;
                    this.createBullet();
                    setTimeout(()=>{
                        isfire = true;
                    },150)
                }
            })
        })
        this.aricraftSprite.on('pointerup',()=>{
            this.aricraftSprite.removeListener('pointermove')
        })

    }
    /* 创建子弹 */
    createBullet (){
        let _bullet = this.bullet.init();
        _bullet.x = this.aricraftSprite.position.x + this.aricraftSprite.width / 2 - _bullet.width/2;
        _bullet.y = this.aricraftSprite.position.y - 28;
        this.bulletArr.push(_bullet);
        this.container.addChild(_bullet);
    }
    /* 创建敌军 */
    createEnemy (time = this.enemyRefreshSpeed){
        this.timer = setInterval(()=>{
            let _enemy =  this.enemy.init(50+Math.random()*$('.app').width()-70,-150);
            this.container.addChild(_enemy);
            this.enemyArr.push(_enemy);
            this.fire();
        },time)
    }
    boundaryLimit (e){
        if(e.position.x + e.width > $('.app').width()){
            e.position.x = $('.app').width() - e.width;
        }
        if(e.position.x < 0){
            e.position.x = 0;
        }
        if(e.position.y + e.height > $('.app').height()){
            e.position.y = $('.app').height() - e.height;
        }
    }
    /* 设置积分 */
    setIntegral (value){
        this.integral.value += value;
        $('.int-value').html(this.integral.value);
        calcRankingList(this.integral.value);
        if(this.integral.value <5 || this.enemyRefreshSpeed < 510) return
        if(this.integral.value % 8 === 0){
            console.log(this.enemyRefreshSpeed)
            clearInterval(this.timer);
            this.createEnemy(this.enemyRefreshSpeed -= 28)
        }
    }
    /* 生命值状态显示 */
    setHealth (){
        switch (this.integral.health){
            case 100:
                    TweenMax.to('.health-value',1,{
                        background:'rgb('+this.healthColor.enough.r+','+this.healthColor.enough.g+','+this.healthColor.enough.b+')'
                    })
                    toast('请注意血量','rgba(255,66,66,0.8)','#fff')
                break;
                case 75:
                    TweenMax.to('.health-value',1,{
                        background:'rgb('+this.healthColor.general.r+','+this.healthColor.general.g+','+this.healthColor.general.b+')'
                    })
                    toast('请注意血量','rgba(255,66,66,0.8)','#fff')
                break;
                case 50:
                    TweenMax.to('.health-value',1,{
                        background:'rgb('+this.healthColor.danger.r+','+this.healthColor.danger.g+','+this.healthColor.danger.b+')'
                    })
                    toast('请注意血量','rgba(255,66,66,0.8)','#fff')
                break;
            case 25:
                this.gameover();
                break;
        }
        TweenMax.to('.health-value',1,{
            width: (this.integral.health-=25)+'%'
        })
        this.aricraft.setInvincible();
    }
    gameover (){
        /* 上报积分 */
        updataRankinglist(this.integral.value,this.userName,(data)=>{
            data.forEach( ( item,index) => {
                if(this.integral.value === item.coin){
                    $('.val1').html(index+1);
                    $('.val2').html(data[index-1].coin - this.integral.value);
                }
            })
        });
        this.aricraftSprite.visible = false;
        clearInterval(this.timer);
        $('.game-over').slideDown(800,()=>{
            
            /* 清空舞台 */
            this.enemy_bulletArr.forEach( ( item,index) => {
                this.ParticleContainer.removeChild(item);
            })
            this.enemyArr.forEach( ( item,index) => {
                this.container.removeChild(item);
            })
            this.enemy_bulletArr = [];
            this.enemyArr = [];
        });
        $('.show-list').click(function(){
            $('.game-over').hide();
            $('.ranking-list-box').show();
        })
    }
    /* 敌机开火 */
    fire (){
        this.enemyArr.forEach( (item,index) => {
            let x = item.x + item.width/2 + 10;
            let y = item.y + item.height/2 + 40;
            let rotation = Math.atan2( x - (this.aricraftSprite.x+this.aricraftSprite.width / 2 + 10),y - (this.aricraftSprite.y+this.aricraftSprite.height/2) );
            let circle_bullet = this.bullet.init(
                new PIXI.Sprite(PIXI.loader.resources['images/bullet2.png'].texture),
                20,20,-Math.cos(rotation)*6,-Math.sin(rotation)*6,rotation
            )  
            circle_bullet.position.set(x,y);
            this.enemy_bulletArr.push(circle_bullet);
            this.ParticleContainer.addChild(circle_bullet);
        })   
    }
    /* 重置 */
    restart (){
        $('.game-over').slideUp(800 ,()=>{
            this.integral.health = 100;
            this.integral.value = 0;
            this.setIntegral(0);
            this.createEnemy();
            TweenMax.to('.health-value',0.5,{
                width: this.integral.health+'%'
            })
            TweenMax.to('.health-value',1,{
                background:'rgb('+this.healthColor.healthy.r+','+this.healthColor.healthy.g+','+this.healthColor.healthy.b+')'
            })
            this.aricraftSprite.visible = true;
            this.aricraftSprite.position.set($('.app').width() / 2 - this.aricraftSprite.width/2,$('.app').height() - this.aricraftSprite.height - 30);
            this.aricraft.setInvincible();
        });
    }
    /* 爆炸 */
    boomPlay(x,y){
        let _boom =  this.boom.play(x,y);
        this.container.addChild(_boom);

        setTimeout(()=>{
            this.container.removeChild(_boom);
        },1000)
    }
}

// 重新开始
$('.restart').click( () => {
    _Main.restart();
})