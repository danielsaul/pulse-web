

var MainPage = React.createClass({
    render: function() {
        var gameRunning = true;

        var play = gameRunning ?
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

        var leaderboard = [
            {'n': 1, 'player': 'luasdan', 'score': 454583},
            {'n': 2, 'player': 'Andy', 'score': 23}
        ];

        var rows = [];
        leaderboard.forEach(function(row) {
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
           <option>
            {this.props.song.artist} - {this.props.song.name}
           </option>
        );
    }
});

var SelectLeaderboard = React.createClass({
    render: function() {
        var songs = [{'name': 'One', 'artist': 'Two'}, {'name': 'Three', 'artist': 'Four'}];

        var options = [];
        songs.forEach(function(song) {
            var key = song.artist + ' : ' + song.name
            options.push(<SelectLeaderboardItem key={key} song={song} />);
        }.bind(this));

        return (
           <div className="leaderboard">
            <select className="form-control" defaultValue="Overall">
                <option>Overall</option>
                {options}
           </select>
           </div>
        );
    }
});

var Leaderboards = React.createClass({
    getInitialState: function(){
        return {
            open: true
        };
    },

    handleClick: function(e){
        //e.preventDefault();
        console.log("test");
        //this.setState({open: !this.state.open});
        //console.log(this.state.open);
        //return false;
    },

    render: function() {

        console.log("Render");
        var chevron = this.state.open ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
        
        var content = this.state.open ? <div><SelectLeaderboard /><br/><LeaderboardTable /></div> : '';

        return (
            <div className="list-group-item">
                <div onClick={this.handleClick}>test</div>
                <h4><a className="no-dec" onClick={this.handleClick} href="#">
                    <Glyphicon icon='glyphicon-list' /> Leaderboards
                    <div className="pull-right" onClick={this.handleClick}><Glyphicon icon={chevron} /></div>
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
        var text = this.state.text.trim();
        if(!text){ return; }
        this.props.onBtn(text);
    },
    render: function() {
        return(
            <div className="form-inline-force">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Enter a nickname"
                    value={this.state.text}
                    onChange={this.handleTextChange}
                />
                <button
                    className="btn btn-primary noborder"
                    onClick={this.handleButton}
                >
                    <Glyphicon icon='glyphicon-circle-arrow-right' />
                </button>
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
        this.manualUpdate();
    },
    componentWillReceiveProps: function() {
        this.manualUpdate();
    },

    componentDidMount: function() {
        connection.session.subscribe("com.emfpulse.queue", this.queueUpdate);
    },

    subscribeState: function(data){
        this.setState(data[0]);
        if(this.state.qn < this.state.nextup){
            this.setState({player_name: null, song: null, qn: null});
        }

    },
    
    manualUpdate: function() {
       connection.session.call("com.emfpulse.queue.status").then(
            function(res){
                this.setState(res);
            if(this.state.qn < this.state.nextup){
                this.setState({player_name: null, song: null, qn: null});
            }
                console.log(res);
        }.bind(this));
    },

    handleGetNameFormBtn: function(name){
        this.setState({player_name: name});
    },

    handleSongChoice: function(song){
        this.setState({song: song});
        connection.session.call("com.emfpulse.queue.new", [this.state.player_name, song.artist, song.name]).then(
            function(res){
                this.setState({qn: res});
                console.log(res);
        }.bind(this),
            function(err){
                this.setState({player_name: null, song: null});
                console.log(err);
        });
    },

    render: function() {


        var title = this.state.qn!=null ? <span>Hey {this.state.player_name}!</span> : 'Want to play?';
        var queue_pos = this.state.qn - this.state.nextup
        var queue_status = this.state.qn==null ?
            <span className="small">There are {this.state.queue_total} people in the queue.</span> 
            : <span className="small">You are number {queue_pos} out of {this.state.queue_total} in the queue.</span>;

        var content;
        if(this.state.player_name == null){
            content = <GetNameForm onBtn={this.handleGetNameFormBtn} />
        }else if(this.state.song == null){
            content = <ChooseSongForm nickname={this.state.player_name} onBtn={this.handleSongChoice} />
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

        var title = this.state.isplaying ? "Currently Playing" : "Nobody Playing";
        var info = this.state.isplaying ? 
            <div>
                <b>{this.state.player}</b><br/>
                {this.state.artist} - {this.state.song}<br/>
                Score: {this.state.score}
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
    url: "ws://emfpulse.com:8080/ws",
    realm: "realm1"
});

connection.onopen = function(session){
    console.log("Connected"); 
    ReactDOM.render(
            <MainPage />,
            document.getElementById('main')
        );

}

connection.open();
