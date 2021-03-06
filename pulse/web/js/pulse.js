

var MainPage = React.createClass({
    getInitialState: function(){
        return {enabled: false};
    },

    componentWillMount: function(){
        connection.session.call("com.emfpulse.enabled.get").then(
            function(enabled){
                this.setState({enabled: enabled});
            }.bind(this)
        );
    },

    componentDidMount: function(){
        connection.session.subscribe("com.emfpulse.enabled.status", this.enableUpdate);
    },

    enableUpdate: function(data){
        this.setState({enabled: data[0]});
    },

    render: function() {

        var play = this.state.enabled ?
                <div>
                    <CurrentlyPlaying />
                    <PlayQueue />
                </div>
            : <Message msg="Pulse is not online at the moment. Come back later." />;
        return (
            <div className="list-group">
                {play}
                <Leaderboards />
            </div>
        );
    }
});

var AdminPage = React.createClass({
    getInitialState: function(e){
        return {pwd: ''};
    },

    handlePwdChange: function(e){
        this.setState({pwd: e.target.value});
    },

    handleToggleEnable: function(){
        connection.session.call("com.emfpulse.enabled.set", [this.state.pwd]);
    },

    handleClearQueue: function(){
        connection.session.call("com.emfpulse.queue.clear", [this.state.pwd]);
    },

    handleClearLeaderboards: function(){
        connection.session.call("com.emfpulse.leaderboards.clear", [this.state.pwd]);
    },

    render: function() {
        return (
            <div className="list-group">
                <div className="list-group-item"><input type="text" className="form-control" placeholder="Password" onChange={this.handlePwdChange} value={this.state.pwd}/></div>
                <button className="list-group-item" onClick={this.handleToggleEnable}>Toggle Enable</button>
                <button className="list-group-item" onClick={this.handleClearQueue}>Clear Queue</button>
                <button className="list-group-item" onClick={this.handleClearLeaderboards}>Clear Leaderboards</button>
            </div>
        );
    }
});

var Message = React.createClass({
    render: function() {
        return (
            <div className="list-group-item dark centre">
                <h4>
                    <Glyphicon icon='glyphicon-exclamation-sign' /> {this.props.msg}
                </h4>
            </div>
        );
    }
});

var LeaderboardTableRow = React.createClass({
    render: function() {
        return (
            <tr>
                <th scope="row">{this.props.row.n}</th>
                <td>{this.props.row.player}</td>
                <td>{this.props.row.score}</td>
            </tr>
        );
    }
});


var LeaderboardTable = React.createClass({
    render: function() {

        var rows = [];
        this.props.leaderboard.forEach(function(row) {
            rows.push(<LeaderboardTableRow key={row.player} row={row} />);
        }.bind(this));

        return (
            <table className="table table-striped">
                <thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        );
    }
});

var SelectLeaderboardItem = React.createClass({
    render: function() {
        return (
           <option value={this.props.i}>
            {this.props.song.artist} - {this.props.song.name}
           </option>
        );
    }
});

var SelectLeaderboard = React.createClass({

    handleChange: function(e) {
        this.props.handleChange(e.target.value);
    },

    render: function() {
        
        var options = [];
        this.props.songs.forEach(function(song,i) {
            options.push(<SelectLeaderboardItem key={i} i={i} song={song} />);
        }.bind(this));

        return (
           <div className="leaderboard">
            <select className="form-control" defaultValue="Overall" onChange={this.handleChange}>
                <option value="all">Overall</option>
                {options}
           </select>
           </div>
        );
    }
});

var Leaderboards = React.createClass({
    getInitialState: function(){
        return {
            open: false,
            songs: [],
            selectedsong: 'all',
            leaderboard: []
        };
    },

    componentWillMount: function() {
        connection.session.call("com.emfpulse.songs.get").then(
            function(res){
                this.setState(res);
                console.log(res);
        }.bind(this));
        
        this.setState({selectedsong: 'all'});
        connection.session.call("com.emfpulse.leaderboards.getall").then(
            function(res){
                this.setState({leaderboard: res});
                console.log(res);
        }.bind(this));
    },

    componentDidMount: function() {
        connection.session.subscribe("com.emfpulse.leaderboards.update", this.leaderboardUpdate);
    },

    leaderboardUpdate: function(data) {
        console.log(data);
        if(this.state.selectedsong == 'all' && data[0].song == null){
            this.setState({leaderboard: data[0].leaderboard});
        }else if(this.state.selectedsong.song == data[0].song && this.state.selectedsong.artist == data[0].artist){
            this.setState({leaderboard: data[0].leaderboard});
        }
    },

    handleTheClick: function() {
        this.setState({open: !this.state.open});
        return false;
    },

    handleSelectChange: function(i) {
        console.log(i)
        if(i == 'all'){
            this.setState({selectedsong: 'all'});
            connection.session.call("com.emfpulse.leaderboards.getall").then(
                function(res){
                    this.setState({leaderboard: res});
                    console.log(res);
            }.bind(this));
        }else{
            var song = this.state.songs[i];
            this.setState({selectedsong: song});
            connection.session.call("com.emfpulse.leaderboards.getforsong", [song.name, song.artist]).then(
                function(res){
                    this.setState({leaderboard: res});
                    console.log(res);
            }.bind(this));

        }
    },

   render: function() {

        var chevron = this.state.open ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
        
        var content = this.state.open ? <div><SelectLeaderboard songs={this.state.songs} handleChange={this.handleSelectChange}/><br/><LeaderboardTable leaderboard={this.state.leaderboard} /></div> : '';

        return (
            <div className="list-group-item">
                <h4 onClick={this.handleTheClick}><a className="no-dec" href="#">
                    <Glyphicon icon='glyphicon-list' /> Leaderboards
                    <div className="pull-right"><Glyphicon icon={chevron} /></div>
                </a></h4>
                {content}
            </div>
        );
    }

});



var ChooseSongFormRow = React.createClass({
    handleButtonClick: function(val) {
        this.props.onBtn(val);
    },
    render: function() {
        return (
            <button type="button" className="list-group-item" onClick={() => this.handleButtonClick(this.props.song)}>
                {this.props.song.artist} - {this.props.song.name}
                <div className="pull-right"><Glyphicon icon='glyphicon-circle-arrow-right' /></div>
            </button>
        );
    }
});

var ChooseSongForm = React.createClass({
    getInitialState: function(){
        return {songs: []};
    },
    componentWillMount: function() {
        connection.session.call("com.emfpulse.songs.get").then(
            function(res){
                this.setState(res);
                console.log(res);
        }.bind(this));
    },

    handleButton: function(song) {
        this.props.onBtn(song);
    },

    render: function() {
        var rows = [];
        this.state.songs.forEach(function(song) {
            var key = song['name']+' - '+song['artist'];
            rows.push(<ChooseSongFormRow key={key} song={song} onBtn={this.handleButton} />);
        }.bind(this));

        return (
            <div className="list-group song-select">
            <br/>
            <div className="list-group-item active"><b>{this.props.nickname}</b>, pick a song:</div>
                {rows}        
            </div>
        );
    }
});

var GetNameForm = React.createClass({
    getInitialState: function(){
        return {text: ''};
    },
    handleTextChange: function(e){
        this.setState({text: e.target.value});
    },
    handleButton: function(e){
        var text = this.state.text.trim().replace(/[^\x20-\x7E]+/g, '');
        if(!text){ return; }
        this.props.onBtn(text);
    },
    render: function() {
        return(
            <div className="form-inline-force">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Enter a unique nickname"
                    value={this.state.text}
                    onChange={this.handleTextChange}
                />
                <button
                    className="btn btn-primary noborder"
                    onClick={this.handleButton}
                >
                    <Glyphicon icon='glyphicon-circle-arrow-right' />
                </button><br/>Tip: use a twitter username with @ for high score mention
            </div>
        );
    }
});

var PlayQueue = React.createClass({
    getInitialState: function(){
        return {
            queue_total: 0,
            player_name: null,
            song: null,
            qn: null,
            nextup: 100
        };
    },
    componentWillMount: function() {

        var qn = localStorage.getItem('qn');
        if (qn && qn > this.state.nextup){
           connection.session.call("com.emfpulse.queue.getinfo", [qn]).then(
               function(data) {
                   data.qn = qn; 
                   this.setState(data);
                   console.log(data);

               }.bind(this));
        }

        this.manualUpdate();
        
    },
    componentWillReceiveProps: function() {
        this.manualUpdate();
    },

    componentDidMount: function() {
        connection.session.subscribe("com.emfpulse.queue", this.subscribeState);
        connection.session.subscribe("com.emfpulse.queue.toolate", this.tooLate);
    },

    subscribeState: function(data){
        this.setState(data[0]);
       console.log(data[0]);
       console.log(this.state);
        if((this.state.qn != null && this.state.qn < this.state.nextup)/*||(this.state.queue_total == 0 && this.state.qn != null)*/){
            this.setState({player_name: null, song: null, qn: null});
            localStorage.setItem('qn', null);
        }


    },
 
    tooLate: function(data){
       console.log(data[0]);
       if(data[0] == this.state.qn){
            this.setState({player_name: null, song: null, qn: null});
            localStorage.setItem('qn', null);
        }


    },
   
    manualUpdate: function() {
       connection.session.call("com.emfpulse.queue.status").then(
            function(res){
                this.setState(res);
                if((this.state.qn != null && this.state.qn < this.state.nextup)/*||(this.state.queue_total == 0 && this.state.qn != null)*/){
                    this.setState({player_name: null, song: null, qn: null});
                    localStorage.setItem('qn', null);
                }
                console.log(res);
        }.bind(this));
    },

    handleGetNameFormBtn: function(name){
        this.setState({player_name: name});
    },

    handleSongChoice: function(song){
        this.setState({song: song});
        connection.session.call("com.emfpulse.queue.new", [this.state.player_name, song.name, song.artist]).then(
            function(res){
                this.setState({'qn': res});
                localStorage.setItem('qn', res);

                console.log(res);
        }.bind(this),
            function(err){
                this.setState({player_name: null, song: null});
                console.log(err);
        }.bind(this));
    },

    render: function() {


        var title = this.state.qn!=null ? <span>Hey {this.state.player_name}!</span> : 'Want to play?';
        var queue_pos = this.state.qn - this.state.nextup;
        var queue_status = this.state.qn==null ?
            <span className="small">There are {this.state.queue_total} people in the queue.</span> 
            : <span className="small">You are number {queue_pos} out of {this.state.queue_total} in the queue.</span>;

        var content;
        if(this.state.player_name == null){
            content = <GetNameForm onBtn={this.handleGetNameFormBtn} />;
        }else if(this.state.song == null){
            content = <ChooseSongForm nickname={this.state.player_name} onBtn={this.handleSongChoice} />;
        }else if(this.state.qn != this.state.nextup){
            content = <div>
                        You're waiting to play {this.state.song.artist} - {this.state.song.name}.<br/>Your unique number is: <h1>{this.state.qn}</h1>
                    </div>;
        }else{
            content = <div>
                        <h1>It's your turn!</h1>
                        Your unique number is {this.state.qn}.<br/>
                        Hit the <span className="red">red</span> button to begin.<br/>
                    </div>;
        }

        return (
            <div className="list-group-item dark centre">
                <h4>
                    <Glyphicon icon='glyphicon-play' /> {title}
                </h4>
                {content}
                {queue_status}
            </div>
        );
    }
});

var CurrentlyPlaying = React.createClass({
    getInitialState: function(){
        return {
            isplaying: false,
            player: null,
            artist: null,
            song: null,
            score: 0
        };
    },

    componentWillMount: function() {
        this.manualUpdate();
    },
    componentWillReceiveProps: function() {
        this.manualUpdate();
    },

    componentDidMount: function() {
        connection.session.subscribe("com.emfpulse.current", this.subscribeState);
    },

    subscribeState: function(data) {
        console.log(data);
        this.setState(data[0]);
    },
    
    manualUpdate: function() {
       connection.session.call("com.emfpulse.playstatus.get").then(
            function(res){
                this.setState(res);
                console.log(res);
        }.bind(this));
    },

    render: function() {

        //var score = this.state.score != 0 ? <span>Score {this.state.score}</span> : "";
        var title = this.state.isplaying ? "Currently Playing" : "Nobody Playing";
        var info = this.state.isplaying ? 
            <div>
                <b>{this.state.player}</b><br/>
                {this.state.artist} - {this.state.song}<br/>
            </div> : "";
        return (
            <div className="list-group-item active centre">
                <h4>
                    <Glyphicon icon='glyphicon-equalizer' /> {title}
                </h4>
                {info}
            </div>
        );
    }
});


var Glyphicon = React.createClass({
    render: function() {
        var iconclass = "glyphicon " + this.props.icon;
        return (
            <span className={iconclass} aria-hidden="true"></span>
        );
    }
});


var connection = new autobahn.Connection({
    /*url: "ws://emfpulse.com:12345/ws",*/
    transports: [
        /*{
            'type': 'websocket',
            'url': 'ws://emfpulse.com:12345/ws'
        },*/
        {
            'type': 'longpoll',
            'url': 'http://'+document.location.host+'/wamp/lp'
        }

    ],
    realm: "realm1"
});

connection.onopen = function(session){
    console.log("Connected");

    if(window.location.hash == "#admin"){
        ReactDOM.render(
                <AdminPage />,
                document.getElementById('main')
            );
    }else{

    ReactDOM.render(
            <MainPage />,
            document.getElementById('main')
        );

    }

}

connection.open();
