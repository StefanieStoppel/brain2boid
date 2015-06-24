function Info(){
    this.onChannelInfoBtnClick();
    this.onNextChannelInfoBtnClick();
    this.onPrevChannelInfoBtnClick();
}

Info.prototype.onChannelInfoBtnClick = function(){
    $('button#info-btn-channels').click(function(){
        $('div#dialog-info-channels').dialog({
            autoOpen: true
        });
    });
};

Info.prototype.onNextChannelInfoBtnClick = function(){
    $('button#show-channel-names-info').click(function(){
        $('div#channel-info-1').hide();
        $('div#channel-info-2').show();
        $('button#show-channel-colour-info').show();
        $('button#show-channel-names-info').hide();
    });
};

Info.prototype.onPrevChannelInfoBtnClick = function(){
    $('button#show-channel-colour-info').click(function(){
        $('div#channel-info-1').show();
        $('div#channel-info-2').hide();
        $('button#show-channel-colour-info').hide();
        $('button#show-channel-names-info').show();
    });
};
