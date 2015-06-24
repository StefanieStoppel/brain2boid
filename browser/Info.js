function Info(){
    this.onInfoBtnChannelsClick();
    this.onShowInfoChannelNamesBtnClick();
    this.onShowInfoChannelColoursBtnClick();
}

Info.prototype.onInfoBtnChannelsClick = function(){
    $('button#info-btn-channels').click(function(){
        $('div#dialog-info-channels').dialog({
            autoOpen: true
        });
    });
};

Info.prototype.onShowInfoChannelNamesBtnClick = function(){
    $('button#show-channel-names-info').click(function(){
        $('div#channel-info-1').hide();
        $('div#channel-info-2').show();
        $('button#show-channel-colour-info').show();
        $('button#show-channel-names-info').hide();
    });
};

Info.prototype.onShowInfoChannelColoursBtnClick = function(){
    $('button#show-channel-colour-info').click(function(){
        $('div#channel-info-1').show();
        $('div#channel-info-2').hide();
        $('button#show-channel-colour-info').hide();
        $('button#show-channel-names-info').show();
    });
};

Info.prototype.openInfoDialog = function(dialog){
    //var infoDialog =
};