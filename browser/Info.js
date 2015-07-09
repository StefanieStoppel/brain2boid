function Info(){
    this.onChannelColourBtnClick();

    this.onFeedbackBtnClick();

    this.onChannelNamesBtnClick();
    this.onChannelNamesNextBtnClick();
    this.onChannelNamesPrevBtnClick();

    this.onTrainingProtocolBtnClick();

    this.onArtifactsBtnClick();

    this.onGeneralInfoBtnClick();
}

Info.prototype.onChannelColourBtnClick = function(){
    $('button#info-btn-channels').click(function(){
        $('div#dialog-info-channels').dialog({
            minWidth: 600,
            autoOpen: true
        });
    });
};

Info.prototype.onFeedbackBtnClick = function(){
    $('button#info-btn-feedback').click(function(){
        $('div#dialog-info-feedback').dialog({
            minWidth: 650,
            autoOpen: true
        })
    });
};

Info.prototype.onChannelNamesBtnClick = function(){
    $('button#info-btn-channel-names').click(function(){
        $('div#dialog-info-channel-names').dialog({
            width: 450,
            autoOpen: true
        });
    });
};

Info.prototype.onChannelNamesNextBtnClick = function(){
    $('button#show-channel-name-2').click(function(){
        $('#channel-name-1').hide();
        $('#channel-name-2').show();
        $(this).hide();
        $('button#show-channel-name-1').show();
    });
};

Info.prototype.onChannelNamesPrevBtnClick = function(){
    $('button#show-channel-name-1').click(function(){
        $('#channel-name-2').hide();
        $('#channel-name-1').show();
        $(this).hide();
        $('button#show-channel-name-2').show();
    });
};

Info.prototype.onTrainingProtocolBtnClick = function(){
    $('button#info-btn-training-protocol').click(function(){
        $('div#dialog-info-training-protocol').dialog({
            minWidth: 400,
            autoOpen: true
        })
    });
};

Info.prototype.onArtifactsBtnClick = function(){
    $('button#info-btn-artifact').click(function(){
        $('div#dialog-info-artifacts').dialog({
            width: 450,
            autoOpen: true
        });
    });
};

Info.prototype.onGeneralInfoBtnClick = function(){
    $('button#general-info-btn').click(function(){
        $('div#dialog-info-general').dialog({
            width: "600px !important",
            position: ['center',20],
            autoOpen: true
        });
        $('button#show-general-info-2').click(function(){
            $('div#general-info-1').hide();
            $('div#general-info-2').show();
            var that = this;
            $(this).hide();
            $('button#show-general-info-1').show();
            $('button#show-general-info-1').click(function(){
                $(this).hide();
                $(that).show();
                $('div#general-info-1').show();
                $('div#general-info-2').hide();
            });
        })
    });
};
